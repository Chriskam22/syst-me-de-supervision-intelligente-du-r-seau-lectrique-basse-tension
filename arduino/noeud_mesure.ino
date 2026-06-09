/*
 * NOEUD DE MESURE - Supervision BT Lubumbashi
 * Prototype soutenance: Arduino UNO + breadboard + potentiometre + relais.
 *
 * A0 -> potentiometre 10K, simule la tension reseau 0-250 V
 * D2 -> relais 5 V, commande de delestage
 *
 * Communication: Serial 9600 bauds, JSON strict, une ligne par mesure.
 */

#define PIN_TENSION   A0
#define PIN_RELAIS    2
#define PIN_LED       13

#define NODE_ID       "NODE_LUB_001"
#define COURANT_MAX   100.0
#define INTERVALLE_MS 2000

unsigned long dernierEnvoi = 0;
bool relaisOuvert = false;

float lireTension() {
  int adc = analogRead(PIN_TENSION);
  return (adc / 1023.0) * 250.0;
}

float calculerCharge(float tension) {
  if (tension < 10.0) return 0.0;
  if (tension < 150.0) return 95.0;
  if (tension < 180.0) return 70.0;
  return 42.0;
}

String determinerStatut(float tension, float charge) {
  if (tension < 10.0) return "PANNE";
  if (tension < 150.0 && charge > 90.0) return "SURCHARGE_CRITIQUE";
  if (tension < 180.0 || charge > 85.0) return "ALERTE";
  return "NORMAL";
}

void appliquerRelais(bool ouvrir) {
  relaisOuvert = ouvrir;
  digitalWrite(PIN_RELAIS, ouvrir ? HIGH : LOW);
  digitalWrite(PIN_LED, ouvrir ? HIGH : LOW);
}

void envoyerAck(const char *ack) {
  Serial.print(F("{\"ack\":\""));
  Serial.print(ack);
  Serial.print(F("\",\"id\":\""));
  Serial.print(NODE_ID);
  Serial.println(F("\"}"));
}

void lireCommandes() {
  if (!Serial.available()) return;

  String cmd = Serial.readStringUntil('\n');
  cmd.trim();

  if (cmd.indexOf("Ouverture") >= 0 || cmd.indexOf("DELESTAGE") >= 0) {
    appliquerRelais(true);
    envoyerAck("RELAIS_OUVERT");
  } else if (cmd.indexOf("Fermeture") >= 0 || cmd.indexOf("RETABLIR") >= 0) {
    appliquerRelais(false);
    envoyerAck("RELAIS_FERME");
  }
}

void envoyerMesure() {
  float tension = lireTension();
  float charge = calculerCharge(tension);
  float courant = charge;
  float puissance = tension * courant;
  float temperature = 32.0;
  String statut = determinerStatut(tension, charge);

  if (statut == "PANNE") {
    appliquerRelais(true);
  }

  if (relaisOuvert) {
    tension = 0.0;
    courant = 0.0;
    puissance = 0.0;
    charge = 0.0;
    statut = "PANNE";
  }

  Serial.print(F("{"));
  Serial.print(F("\"id\":\"")); Serial.print(NODE_ID); Serial.print(F("\","));
  Serial.print(F("\"tension\":")); Serial.print(tension, 1); Serial.print(F(","));
  Serial.print(F("\"courant\":")); Serial.print(courant, 1); Serial.print(F(","));
  Serial.print(F("\"puissance\":")); Serial.print(puissance, 1); Serial.print(F(","));
  Serial.print(F("\"charge\":")); Serial.print(charge, 1); Serial.print(F(","));
  Serial.print(F("\"temperature\":")); Serial.print(temperature, 1); Serial.print(F(","));
  Serial.print(F("\"statut\":\"")); Serial.print(statut); Serial.print(F("\""));
  Serial.println(F("}"));
}

void setup() {
  Serial.begin(9600);
  pinMode(PIN_RELAIS, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  appliquerRelais(false);

  Serial.println(F("{\"boot\":\"ok\",\"id\":\"" NODE_ID "\"}"));
}

void loop() {
  lireCommandes();

  if (millis() - dernierEnvoi >= INTERVALLE_MS) {
    dernierEnvoi = millis();
    envoyerMesure();
  }
}
