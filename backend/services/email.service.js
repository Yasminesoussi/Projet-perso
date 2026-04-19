// Service d'email.
// Il sert surtout a prevenir l'etudiant quand son compte est accepte ou refuse.

// Import de la librairie nodemailer (envoi d'emails)
const nodemailer = require("nodemailer");

// Récupération des variables d'environnement (config SMTP)
const host = process.env.SMTP_HOST; // serveur mail (ex: smtp.gmail.com)
const port = parseInt(process.env.SMTP_PORT || "587", 10); // port (587 = TLS, 465 = SSL)
const user = process.env.SMTP_USER; // email expéditeur
const pass = process.env.SMTP_PASS; // mot de passe email
const fromEmail = process.env.FROM_EMAIL || "no-reply@univ-resto.local"; // email affiché
const appUrl = process.env.APP_URL || "http://localhost:5000"; // URL de ton app

// Transporteur qui envoie les emails.
let transporter;

// Permet de savoir si on travaille en mode test.
let usingTestAccount = false;

// ============================
// FONCTION POUR INITIALISER LE TRANSPORTER
// ============================
async function ensureTransporter() {

  // Si déjà créé → on le retourne (évite recréer à chaque fois)
  if (transporter) return transporter;

  // En production on utilise le vrai SMTP du projet.
  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host, // serveur SMTP
      port, // port
      secure: port === 465, // true si SSL (465), sinon false
      auth: { user, pass } // authentification
    });
    return transporter;
  }

  // Sinon on bascule sur Ethereal pour tester sans vraie boite mail.
  const testAccount = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass }
  });

  // On indique qu'on utilise un compte test
  usingTestAccount = true;

  return transporter;
}

// ============================
// ENVOI EMAIL STATUT ÉTUDIANT
// ============================
async function sendStudentStatusEmail(to, status) {

  // Initialiser le transporteur (SMTP ou test)
  const tx = await ensureTransporter();

  // Vérifier si accepté ou refusé
  const accepted = status === "ACCEPTED";

  // Sujet de l'email
  const subject = accepted
    ? "Votre compte a été accepté"
    : "Votre compte a été refusé";

  // Texte affiché
  const statusText = accepted ? "ACCEPTÉ" : "REFUSÉ";

  // Message selon statut
  const actionText = accepted
    ? "Vous pouvez maintenant vous connecter."
    : "Veuillez contacter l’administration pour plus d’informations.";

  // Lien vers la page d'entree de l'application.
  const loginLink = `${appUrl}`;

  // Contenu HTML de l'email
  const html =
    `<div style="font-family: Arial, sans-serif; color:#333">
      <h2>Restauration Universitaire</h2>

      <!-- Message principal -->
      <p>Votre demande de création de compte a été ${statusText.toLowerCase()}.</p>

      <!-- Action -->
      <p>${actionText}</p>

      <!-- Bouton connexion si accepté -->
      ${accepted ? `
        <p>
          <a href="${loginLink}"
             style="display:inline-block;padding:10px 16px;background:#4CAF50;color:#fff;border-radius:6px;text-decoration:none">
             Se connecter
          </a>
        </p>` : ""}

      <!-- Footer -->
      <p style="margin-top:20px;font-size:12px;color:#777">
        Ne pas répondre à cet e-mail.
      </p>
    </div>`;

  // Envoi de l'email
  const info = await tx.sendMail({
    from: fromEmail, // expéditeur
    to,              // destinataire
    subject,         // sujet
    html             // contenu HTML
  });

  // Si compte test → générer lien preview (Ethereal)
  const previewUrl = usingTestAccount
    ? nodemailer.getTestMessageUrl(info)
    : undefined;

  // Retourner preview (utile en dev)
  return { previewUrl };
}

// Export de la fonction
module.exports = { sendStudentStatusEmail };
