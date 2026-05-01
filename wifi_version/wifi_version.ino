#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <AccelStepper.h>

// ===== ACCESS POINT =====
const char* ssid = "MoonTracker";
const char* password = "12345678";

ESP8266WebServer server(80);

// ===== MOTOR CONFIG =====
const float STEPS_PER_REV = 2048.0;

// AZIMUTH
#define AZ_IN1 5
#define AZ_IN2 4
#define AZ_IN3 14
#define AZ_IN4 12

AccelStepper stepperAz(AccelStepper::FULL4WIRE, AZ_IN1, AZ_IN3, AZ_IN2, AZ_IN4);

// ALTITUDE
#define ALT_IN1 13
#define ALT_IN2 15
#define ALT_IN3 0
#define ALT_IN4 2

AccelStepper stepperAlt(AccelStepper::FULL4WIRE, ALT_IN1, ALT_IN3, ALT_IN2, ALT_IN4);

// ===== MOTOR STATE =====
bool azRunning  = false;
bool altRunning = false;

// ===== CONVERT =====
long degToSteps(float deg) {
  return (long)(deg * STEPS_PER_REV / 360.0);
}

// ===== ROOT TEST =====
void handleRoot() {
  Serial.println("ROOT HIT");
  server.send(200, "text/plain", "ESP8266 READY");
}

// ===== MOVE COMMAND =====
void handleMove() {
  if (!server.hasArg("az") || !server.hasArg("alt")) {
    server.send(400, "text/plain", "Missing az/alt");
    return;
  }

  float az  = server.arg("az").toFloat();
  float alt = server.arg("alt").toFloat();

  Serial.println("MOVE:");
  Serial.println("AZ:  " + String(az));
  Serial.println("ALT: " + String(alt));

  // Re-enable coils before moving (they were disabled after last move)
  stepperAz.enableOutputs();
  stepperAlt.enableOutputs();

  stepperAz.move(degToSteps(az));
  stepperAlt.move(degToSteps(alt));

  azRunning  = true;
  altRunning = true;

  server.send(200, "text/plain", "MOVING");
}

// ===== SETUP =====
void setup() {
  Serial.begin(115200);

  // Motors
  stepperAz.setMaxSpeed(400);
  stepperAz.setAcceleration(150);

  stepperAlt.setMaxSpeed(400);
  stepperAlt.setAcceleration(150);

  // Power off coils at startup — no movement needed yet
  stepperAz.disableOutputs();
  stepperAlt.disableOutputs();

  // WiFi AP
  WiFi.softAP(ssid, password);
  Serial.println("AP Started");
  Serial.println(WiFi.softAPIP());

  // Routes
  server.on("/", handleRoot);
  server.on("/move", handleMove);

  server.begin();
}

// ===== LOOP =====
void loop() {
  server.handleClient();

  // Run azimuth motor; cut power once it reaches target
  if (azRunning) {
    stepperAz.run();
    if (stepperAz.distanceToGo() == 0) {
      stepperAz.disableOutputs();
      azRunning = false;
      Serial.println("AZ done — coils off");
    }
  }

  // Run altitude motor; cut power once it reaches target
  if (altRunning) {
    stepperAlt.run();
    if (stepperAlt.distanceToGo() == 0) {
      stepperAlt.disableOutputs();
      altRunning = false;
      Serial.println("ALT done — coils off");
    }
  }
}