#include <Arduino.h>
#include <GxEPD2_3C.h>
#include <SPI.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

namespace {
constexpr uint8_t  kEpdCsPin          = 5;
constexpr uint8_t  kEpdDcPin          = 16;
constexpr uint8_t  kEpdRstPin         = 17;
constexpr uint8_t  kEpdBusyPin        = 4;
constexpr char     kSsid[]            = "Kv-130";
constexpr char     kPassword[]        = "0501352222";
constexpr char     kOwmKey[]          = "27826f4665bd9badb62441480dc1f25e";
constexpr char     kNtpServer[]       = "pool.ntp.org";
constexpr long     kGmtOffsetSec      = 3 * 3600;
constexpr int      kDaylightOffsetSec = 0;
constexpr uint32_t kRefreshIntervalMs = 600000;

struct Weather {
  int  tempC    = 0;
  int  humidity = 0;
  int  owmId    = 0;      // OWM weather id (800=clear, 500=rain…)
  char icon[4]  = "01d";  // OWM icon code, last char 'd'=day 'n'=night
  char desc[32] = {};
  bool valid    = false;
} gWeather;
}  // namespace

GxEPD2_3C<GxEPD2_154c, GxEPD2_154c::HEIGHT> display(
    GxEPD2_154c(kEpdCsPin, kEpdDcPin, kEpdRstPin, kEpdBusyPin));

namespace {

// ── icons ─────────────────────────────────────────────────

// ☀ day sun — red
void drawSun(int16_t cx, int16_t cy) {
  display.fillCircle(cx, cy, 13, GxEPD_RED);
  display.fillRect(cx - 2, cy - 23, 4, 7, GxEPD_RED);
  display.fillRect(cx - 2, cy + 17, 4, 7, GxEPD_RED);
  display.fillRect(cx - 23, cy - 2, 7, 4, GxEPD_RED);
  display.fillRect(cx + 17, cy - 2, 7, 4, GxEPD_RED);
  display.fillRect(cx + 10, cy - 19, 4, 6, GxEPD_RED);
  display.fillRect(cx - 13, cy - 19, 4, 6, GxEPD_RED);
  display.fillRect(cx + 10, cy + 14, 4, 6, GxEPD_RED);
  display.fillRect(cx - 13, cy + 14, 4, 6, GxEPD_RED);
}

// 🌙 night moon — black crescent
void drawMoon(int16_t cx, int16_t cy) {
  display.fillCircle(cx, cy, 14, GxEPD_BLACK);
  display.fillCircle(cx + 8, cy - 3, 11, GxEPD_WHITE);  // crescent cutout
}

void drawCloud(int16_t cx, int16_t cy, uint16_t col) {
  display.fillCircle(cx - 11, cy + 5, 11, col);
  display.fillCircle(cx +  2, cy - 1, 14, col);
  display.fillCircle(cx + 15, cy + 7,  9, col);
  display.fillRect  (cx - 11, cy + 5, 26, 12, col);
}

// 🌤 day partly cloudy: red sun + black cloud
void drawPartlyCloudy(int16_t cx, int16_t cy) {
  drawSun(cx - 9, cy - 7);
  drawCloud(cx + 4, cy + 5, GxEPD_WHITE);  // mask part of sun
  drawCloud(cx + 4, cy + 5, GxEPD_BLACK);
}

// 🌛 night partly cloudy: moon + black cloud
void drawNightPartlyCloudy(int16_t cx, int16_t cy) {
  drawMoon(cx - 9, cy - 7);
  drawCloud(cx + 4, cy + 5, GxEPD_WHITE);
  drawCloud(cx + 4, cy + 5, GxEPD_BLACK);
}

// 🌧 rain
void drawRain(int16_t cx, int16_t cy) {
  drawCloud(cx, cy - 8, GxEPD_BLACK);
  for (int16_t i = 0; i < 4; i++)
    display.fillRect(cx - 12 + i * 8, cy + 10, 3, 9, GxEPD_BLACK);
}

// ❄ snow
void drawSnow(int16_t cx, int16_t cy) {
  drawCloud(cx, cy - 8, GxEPD_BLACK);
  for (int16_t i = 0; i < 4; i++)
    display.fillCircle(cx - 13 + i * 9, cy + 15, 3, GxEPD_BLACK);
}

// OWM ids: 800=clear 801-802=partly 803-804=cloudy
//          2xx=thunder 3xx=drizzle 5xx=rain 6xx=snow 7xx=mist
void drawWeatherIcon(int16_t cx, int16_t cy, int id, bool isDay) {
  if      (id == 800)               { if (isDay) drawSun(cx, cy);          else drawMoon(cx, cy); }
  else if (id == 801 || id == 802)  { if (isDay) drawPartlyCloudy(cx, cy); else drawNightPartlyCloudy(cx, cy); }
  else if (id <= 804)               drawCloud(cx, cy, GxEPD_BLACK);  // 803-804 overcast
  else if (id < 300)                drawRain(cx, cy);   // 2xx thunderstorm
  else if (id < 400)                drawCloud(cx, cy, GxEPD_BLACK);  // 3xx drizzle → cloud
  else if (id < 600)                drawRain(cx, cy);   // 5xx rain
  else if (id < 700)                drawSnow(cx, cy);   // 6xx snow
  else                              drawCloud(cx, cy, GxEPD_BLACK);  // 7xx mist/fog
}

// ── UI layout (200 × 200, BW + Red) ──────────────────────
//
//  ▌ KYIV (size 2)       21:30 (size 3, far right)  y=4-28
//  ▌ Wed 16 Apr (size 1)                           y=28
//  ▌ ─────────────────────────────    y=42 separator
//  ▌                                  y=48
//  ▌ +11 °C              [ icon ]     y=48 textSize 4
//  ▌                                  y=80
//  ▌ Partly cloudy                    y=100 desc
//  ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌  y=103 red bar
//  ▌ HUMIDITY                         y=112
//  ▌ 84%                              y=122 textSize 2 RED
//  ▌ [████████░░░░░░]                 y=142 bar
//  ▌ ─────────────────────────────    y=157 separator
//  ▌ wttr.in           ~10 min        y=164
//  ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌  y=188 red bottom

void drawUI() {
  display.fillScreen(GxEPD_WHITE);

  // ── left accent stripe ──────────────────────────────────
  display.fillRect(0, 0, 6, 200, GxEPD_RED);

  // ── time & date from NTP ────────────────────────────────
  struct tm t;
  bool hasTime = getLocalTime(&t, 0);
  // OWM icon last char: 'd'=day, 'n'=night (more accurate than hour check)
  bool isDay = gWeather.valid ? (gWeather.icon[2] == 'd')
                              : (!hasTime || (t.tm_hour >= 6 && t.tm_hour < 22));

  // KYIV — left corner, textSize 2
  display.setTextColor(GxEPD_BLACK);
  display.setTextSize(2);
  display.setCursor(14, 8);
  display.print("KYIV");

  if (hasTime) {
    char timeBuf[6], dateBuf[16];
    strftime(timeBuf, sizeof(timeBuf), "%H:%M", &t);
    strftime(dateBuf, sizeof(dateBuf), "%a %d %b", &t);  // "Wed 16 Apr"

    // time — far right, textSize 3 (18 px/char × 5 = 90 px)
    // header zone y=2..42 (40 px), time 24 px tall → centre → y=10
    display.setTextSize(3);
    display.setCursor(108, 10);
    display.print(timeBuf);

    // date — below KYIV, textSize 1
    display.setTextSize(1);
    display.setCursor(14, 28);
    display.print(dateBuf);
  } else {
    display.setTextSize(1);
    display.setCursor(14, 28);
    display.print("--:--");
  }

  // ── separator ────────────────────────────────────────────
  display.fillRect(14, 42, 180, 1, GxEPD_BLACK);

  // ── temperature ──────────────────────────────────────────
  // textSize 4 = 24 px wide, 32 px tall per char
  String tStr;
  if (!gWeather.valid) {
    tStr = "--";
  } else {
    if (gWeather.tempC > 0) tStr = "+";
    tStr += String(gWeather.tempC);
  }
  int16_t sufX = 14 + (int16_t)tStr.length() * 24;

  display.setTextSize(4);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(14, 56);
  display.print(tStr);

  // degree ring + C  (temp top y=56, degree centre +6 → y=62)
  display.drawCircle(sufX + 5, 62, 3, GxEPD_BLACK);
  display.setTextSize(2);
  display.setCursor(sufX + 10, 56);
  display.print("C");

  // ── weather icon ─────────────────────────────────────────
  if (gWeather.valid)
    drawWeatherIcon(162, 76, gWeather.owmId, isDay);

  // ── description ──────────────────────────────────────────
  // description — below icon (cloud bottom ≈ y=98), 4 px gap
  display.setTextSize(1);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(14, 100);
  display.print(gWeather.valid ? gWeather.desc : "Fetching...");

  // ── red mid-bar  (desc text y=100, h=8 → ends y=108; bar starts y=113)
  display.fillRect(0, 113, 200, 3, GxEPD_RED);

  // ── humidity ─────────────────────────────────────────────
  display.setTextSize(1);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(14, 122);
  display.print("HUMIDITY");

  display.setTextSize(2);
  display.setTextColor(GxEPD_RED);
  display.setCursor(14, 132);
  if (gWeather.valid) {
    display.print(gWeather.humidity);
    display.print("%");
  } else {
    display.print("--");
  }

  // humidity progress bar  (value textSize 2 = 16 px → ends y=148; bar y=152)
  display.fillRect(14, 152, 170, 6, GxEPD_BLACK);
  display.fillRect(15, 153, 168, 4, GxEPD_WHITE);
  if (gWeather.valid) {
    int16_t fill = (int16_t)map(gWeather.humidity, 0, 100, 0, 168);
    if (fill > 0) display.fillRect(15, 153, fill, 4, GxEPD_RED);
  }

  // ── footer ───────────────────────────────────────────────
  display.fillRect(14, 163, 180, 1, GxEPD_BLACK);
  display.setTextSize(1);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(14, 170);
  display.print("openweathermap");
  display.setCursor(110, 170);
  display.print("~10 min update");

  // ── bottom red stripe  (footer text ends y=178; stripe y=188)
  display.fillRect(0, 188, 200, 12, GxEPD_RED);

  // ── outer black border 2 px ───────────────────────────────
  display.drawRect(0, 0, 200, 200, GxEPD_BLACK);
  display.drawRect(1, 1, 198, 198, GxEPD_BLACK);
}

// ── weather fetch ─────────────────────────────────────────

void fetchWeather() {
  WiFiClient client;
  HTTPClient http;
  // OpenWeatherMap: units=metric → °C, lang=en → English desc
  String url = String("http://api.openweathermap.org/data/2.5/weather"
                      "?q=Kyiv,UA&units=metric&lang=en&appid=") + kOwmKey;
  http.begin(client, url);
  http.setTimeout(10000);

  if (http.GET() == HTTP_CODE_OK) {
    String payload = http.getString();

    StaticJsonDocument<128> filter;
    filter["weather"][0]["id"]          = true;
    filter["weather"][0]["description"] = true;
    filter["weather"][0]["icon"]        = true;
    filter["main"]["temp"]              = true;
    filter["main"]["humidity"]          = true;

    DynamicJsonDocument doc(512);
    if (!deserializeJson(doc, payload, DeserializationOption::Filter(filter))) {
      gWeather.owmId    = doc["weather"][0]["id"].as<int>();
      gWeather.tempC    = (int)roundf(doc["main"]["temp"].as<float>());
      gWeather.humidity = doc["main"]["humidity"].as<int>();
      strlcpy(gWeather.icon, doc["weather"][0]["icon"] | "01d", sizeof(gWeather.icon));
      strlcpy(gWeather.desc, doc["weather"][0]["description"] | "---", sizeof(gWeather.desc));
      gWeather.valid = true;
    }
  }
  http.end();
}

}  // namespace

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_8_5dBm);  // lower TX power → less current
  WiFi.begin(kSsid, kPassword);
  Serial.print("Wi-Fi:");
  uint8_t tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500);
    Serial.print('.');
    tries++;
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " OK" : " FAIL");
}

void drawScreen() {
  display.setFullWindow();
  display.firstPage();
  do { drawUI(); } while (display.nextPage());
}

void setup() {
  Serial.begin(115200);

  btStop();               // Bluetooth не используется
  connectWiFi();
  configTime(kGmtOffsetSec, kDaylightOffsetSec, kNtpServer);
  struct tm _ntp;
  getLocalTime(&_ntp, 8000);

  display.init(115200);
  display.setRotation(0);
  fetchWeather();
  drawScreen();

  // ── выключаем всё перед сном ────────────────────────────
  display.hibernate();          // e-ink держит картинку без питания
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  Serial.flush();

  // ── глубокий сон до следующего обновления ───────────────
  esp_sleep_enable_timer_wakeup(kRefreshIntervalMs * 1000ULL);
  esp_deep_sleep_start();       // ~10 мкА вместо ~240 мА
}

void loop() {}  // недостижимо — deep sleep перезапускает setup()
