from flask import Flask, request, redirect, jsonify
from flask_cors import CORS
import uuid
import smtplib
from email.mime.text import MIMEText
from datetime import datetime
import os
import firebase_admin
from firebase_admin import firestore

# Initialisation Firebase via variable GOOGLE_APPLICATION_CREDENTIALS
firebase_admin.initialize_app()
db = firestore.client()

app = Flask(__name__)
CORS(app)

# Configuration SMTP Gmail
smtp_server = "smtp.gmail.com"
smtp_port = 587
smtp_user = "g.akermann@gmail.com"
smtp_password = "uqeu rete njfa hkpl"

# Fonction d'envoi de l'e-mail de confirmation
def send_confirmation_email(email, token):
    confirm_url = f"https://pirate-4c51ce.gitlab.io/confirmation.html?token={token}"
    unsubscribe_url = f"https://pirate-4c51ce.gitlab.io/desinscription.html?token={token}"
    
    body = f"""
Bonjour,

Merci de vous être inscrit·e à la newsletter de La Cagette Pirate !

Pour confirmer votre inscription, cliquez sur le lien ci-dessous :
👉 {confirm_url}

Si vous n’avez rien demandé, ignorez simplement ce message.

Si vous avez confirmé mais que vous ne souhaitez plus recevoir de messages :
👉 {unsubscribe_url}

À bientôt ✊🌱
— L’équipe de La Cagette Pirate
"""
    message = MIMEText(body)
    message['Subject'] = "Confirmez votre inscription à la newsletter"
    message['From'] = smtp_user
    message['To'] = email

    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(message['From'], [message['To']], message.as_string())

# Route : formulaire d'inscription
@app.route("/api/subscribe", methods=["POST"])
def subscribe():
    email = request.form.get("email")
    if not email:
        return "Email requis", 400

    # Vérifie si l'adresse est déjà inscrite (pending ou confirmed)
    existing = db.collection("subscribers").where("email", "==", email).stream()
    for doc in existing:
        status = doc.to_dict().get("status")
        if status in ["pending", "confirmed"]:
            return redirect("https://pirate-4c51ce.gitlab.io/deja-inscrit.html")

    # Sinon, crée un nouveau token et ajoute le document
    token = str(uuid.uuid4())
    db.collection("subscribers").add({
        "email": email,
        "token": token,
        "status": "pending",
        "timestamp": datetime.now().isoformat()
    })

    send_confirmation_email(email, token)
    return redirect("https://pirate-4c51ce.gitlab.io/merci.html")


# Route : confirmation du lien
@app.route("/api/confirm", methods=["GET"])
def confirm():
    token = request.args.get("token")
    if not token:
        return jsonify({"success": False})

    docs = db.collection("subscribers").where("token", "==", token).stream()
    found = False
    for doc in docs:
        db.collection("subscribers").document(doc.id).update({"status": "confirmed"})
        found = True

    return jsonify({"success": found})

# Route : désinscription
@app.route("/api/unsubscribe", methods=["GET"])
def unsubscribe():
    token = request.args.get("token")
    if not token:
        return jsonify({"success": False, "error": "Token manquant"})

    docs = db.collection("subscribers").where("token", "==", token).stream()
    found = False
    for doc in docs:
        db.collection("subscribers").document(doc.id).delete()

        found = True

    return jsonify({"success": found})

if __name__ == "__main__":
    app.run(debug=True)
