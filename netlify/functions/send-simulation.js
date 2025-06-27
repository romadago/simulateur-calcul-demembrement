// Fichier : netlify/functions/send-simulation.js
// Version corrigée en syntaxe ES Module pour la compatibilité

import { Resend } from 'resend';

// --- Helper function to format the main body of the email based on the theme ---
function getEmailBody(theme, data) {
    const { objectifs, resultats } = data;
    const commonFooter = `
        <p style="margin-top: 25px;">Pour une analyse complète et des conseils adaptés à votre situation, n'hésitez pas à nous contacter.</p>
        <br>
        <p>Cordialement,</p>
        <p><strong>L'équipe Aeternia Patrimoine</strong></p>
    `;

    // Cas du simulateur de Calcul de Démembrement
    if (theme === 'Calcul Démembrement') {
        return `
            <p>Merci d'avoir utilisé notre simulateur. Voici le résumé de votre calcul de démembrement de propriété :</p>
            <h3 style="color: #333;">Vos paramètres :</h3>
            <ul style="list-style-type: none; padding-left: 0; border-left: 3px solid #00FFD2; padding-left: 15px;">
                <li><strong>Valeur de l'actif :</strong> ${objectifs.valeurActif}</li>
                <li><strong>Âge de l'usufruitier :</strong> ${objectifs.ageUsufruitier}</li>
            </ul>
            <h3 style="color: #333;">Résultat de la répartition :</h3>
            <div style="background-color: #f7f7f7; border-radius: 8px; padding: 20px; text-align: center;">
                <p style="font-size: 16px; margin: 10px 0;">Valeur de la <strong>Nue-Propriété :</strong> <span style="font-weight: bold; color: #00877a;">${resultats.valeurNuePropriete}</span></p>
                <p style="font-size: 16px; margin: 10px 0;">Valeur de l'<strong>Usufruit :</strong> <span style="font-weight: bold; color: #4338ca;">${resultats.valeurUsufruit}</span></p>
            </div>
            ${commonFooter}
        `;
    }

    // Cas du simulateur Succession / Donation
    if (theme === 'Succession') {
        let resultsHtml;
        if (objectifs.typeTransmission === 'Succession' && objectifs.lienParente === 'conjoint') {
            resultsHtml = `<div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; text-align: center;">
                             <p style="font-size: 16px; font-weight: bold; color: #16a34a;">Exonération totale des droits de succession pour le conjoint ou partenaire de PACS.</p>
                           </div>`;
        } else {
            resultsHtml = `
                <div style="background-color: #f7f7f7; border-radius: 8px; padding: 20px; text-align: center;">
                    <p style="margin: 0; font-size: 16px;">Le montant des droits à payer est estimé à :</p>
                    <p style="font-size: 24px; font-weight: bold; color: #b91c1c; margin: 10px 0;">${resultats.droitsAPayer}</p>
                    <p style="font-size: 14px; color: #555; margin: 0;">Le montant net reçu serait de <strong>${resultats.montantNet}</strong> (après un abattement de ${resultats.abattementApplique}).</p>
                </div>`;
        }
        
        return `
            <p>Merci d'avoir utilisé notre simulateur. Voici le résumé de votre simulation de droits de transmission :</p>
            <h3 style="color: #333;">Vos paramètres :</h3>
            <ul style="list-style-type: none; padding-left: 0; border-left: 3px solid #00FFD2; padding-left: 15px;">
                <li><strong>Type de transmission :</strong> ${objectifs.typeTransmission}</li>
                <li><strong>Lien de parenté :</strong> ${objectifs.lienParente}</li>
                <li><strong>Montant transmis :</strong> ${objectifs.montantTransmis}</li>
                <li><strong>Donations antérieures (- de 15 ans) :</strong> ${objectifs.donationsAnterieures}</li>
            </ul>
            <h3 style="color: #333;">Résultats de votre projet :</h3>
            ${resultsHtml}
            ${commonFooter}
        `;
    }

    // Template générique pour tous les autres simulateurs (épargne objectif)
    const emailTemplates = {
        'default': { title: "le résumé de votre simulation", objectiveLabel: "Revenu mensuel souhaité" },
        'Aider un proche': { title: "le résumé de votre projet d'aide financière", objectiveLabel: "Aide mensuelle à verser" },
        'Études enfant': { title: "le résumé de votre projet pour les études de votre enfant", objectiveLabel: "Revenu mensuel pour ses études" },
        'Retraite': { title: "le résumé de votre projet de retraite", objectiveLabel: "Revenu mensuel souhaité à la retraite" },
        'Année sabbatique': { title: "le résumé de votre projet d'année sabbatique", objectiveLabel: "Budget mensuel nécessaire" },
        'Revenu Passif': { title: "le résumé de votre projet d'indépendance financière", objectiveLabel: "Revenu passif mensuel souhaité" }
    };
    const template = emailTemplates[theme] || emailTemplates['default'];

    return `
        <p>Merci d'avoir utilisé notre simulateur. Voici ${template.title} :</p>
        <h3 style="color: #333;">Vos paramètres :</h3>
        <ul style="list-style-type: none; padding-left: 0; border-left: 3px solid #00FFD2; padding-left: 15px;">
            <li><strong>${template.objectiveLabel} :</strong> ${objectifs.revenuRecherche}</li>
            <li><strong>Durée de l'épargne :</strong> ${objectifs.dureePlacement}</li>
            <li><strong>Votre apport initial :</strong> ${objectifs.versementInitial}</li>
        </ul>
        <h3 style="color: #333;">Résultats de votre projet :</h3>
        <div style="background-color: #f7f7f7; border-radius: 8px; padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 16px;">Pour atteindre votre objectif, votre effort d'épargne mensuel suggéré est de :</p>
            <p style="font-size: 24px; font-weight: bold; color: #00877a; margin: 10px 0;">${resultats.versementMensuelRequis} / mois</p>
            <p style="font-size: 14px; color: #555; margin: 0;">Cet effort vous permettrait de viser un capital final de <strong>${resultats.capitalVise}</strong>.</p>
        </div>
        ${commonFooter}
    `;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = JSON.parse(event.body);
    
    const { email, data, theme = 'default' } = body;

    if (!data || !data.objectifs || !data.resultats) {
        throw new Error("Données de simulation manquantes ou invalides.");
    }
    
    const emailSubjects = {
        'default': `Votre simulation d'épargne Aeternia Patrimoine`,
        'Aider un proche': `Votre simulation pour aider un proche`,
        'Études enfant': `Votre simulation pour les études de votre enfant`,
        'Retraite': `Votre simulation de retraite complémentaire`,
        'Année sabbatique': `Votre simulation pour votre année sabbatique`,
        'Revenu Passif': `Votre simulation d'indépendance financière`,
        'Démembrement': `Votre simulation d'investissement en démembrement`,
        'Succession': `Votre simulation de droits de succession`,
        'Calcul Démembrement': "Votre calcul de démembrement de propriété"
    };

    const subject = emailSubjects[theme] || emailSubjects['default'];
    const emailBodyHtml = getEmailBody(theme, data);

    await resend.emails.send({
      from: 'Aeternia Patrimoine <contact@aeterniapatrimoine.fr>', 
      to: [email],
      bcc: ['contact@aeterniapatrimoine.fr'],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
          <h2 style="color: #333;">Bonjour,</h2>
          ${emailBodyHtml}
          <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;">
          <p style="font-size: 10px; color: #777; text-align: center; margin-top: 20px;">
            Les informations et résultats fournis par ce simulateur sont donnés à titre indicatif et non contractuel. Ils sont basés sur les hypothèses de calcul et les paramètres que vous avez renseignés et ne constituent pas un conseil en investissement.
          </p>
        </div>
      `,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email envoyé avec succès !' }),
    };

  } catch (error) {
    console.error("Erreur dans la fonction Netlify :", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Une erreur est survenue lors de l'envoi de l'email." }),
    };
  }
};