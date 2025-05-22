from flask import Flask, request, redirect, jsonify
from flask_cors import CORS
import uuid
import smtplib
from email.mime.text import MIMEText
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

# Initialisation Firebase
cred = credentials.Certificate("firebase_config.json")  # ne pas versionner ce fichier !
firebase_admin.initialize_app(cred)
db = firestore.client()

app = Flask(__name__)
CORS(app)

def send_confirmation_email(email, token):
    confirm_url = f"https://tonutilisateur.gitlab.io/tonrepo/confirmation.html?token={token}"
    message = MIMEText(f"Merci de vous être inscrit à la newsletter ! Cliquez ici pour confirmer : {confirm_url}")
    message['Subject'] = "Confirmez votre inscription"
    message['From'] = "TON_ADRESSE@gmail.com"
    message['To'] = email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login("TON_ADRESSE@gmail.com", "TON_APP_PASSWORD")
        server.sendmail(message['From'], [message['To']], message.as_string())

@app.route("/api/subscribe", methods=["POST"])
def subscribe():
    email = request.form.get("email")
    if not email:
        return "Email requis", 400

    token = str(uuid.uuid4())
    db.collection("subscribers").add({
        "email": email,
        "token": token,
        "status": "pending",
        "timestamp": datetime.now().isoformat()
    })
    send_confirmation_email(email, token)
    return redirect("https://tonutilisateur.gitlab.io/tonrepo/merci.html")

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

if __name__ == "__main__":
    app.run()
