export default {
  auth: {
    title: "Portail des Employés",
    description: "Saisissez votre adresse e-mail pour recevoir un mot de passe à usage unique.",
    options: "Plus d'options",
    email: {
      otp_sent: "Mot de passe à usage unique envoyé",
      otp_description: "Vérifiez votre e-mail pour le mot de passe à usage unique",
      otp_try_again: "Réessayer",
      placeholder: "Votre e-mail professionnel",
      button: "Continuer",
    },
  },
  powered_by: {
    title: "Comp AI - Plateforme de Conformité OSS",
    description:
      "Obtenez la conformité SOC 2, ISO 27001 et RGPD en quelques semaines, pas en mois. Open source, inscription instantanée, essai gratuit.",
    learn_more: "Commencer l'essai gratuit et être conforme",
    learn_more_link: "https://trycomp.ai",
  },
  user_menu: {
    theme: "Thème",
    language: "Langue",
    sign_out: "Se déconnecter",
  },
  not_found: {
    title: "Page Non Trouvée",
    description: "La page que vous recherchez n'existe pas.",
    return: "Retourner à la page d'accueil",
  },
  sidebar: {
    dashboard: "Vue d'ensemble du Portail des Employés",
  },
  language: {
    placeholder: "Sélectionner la langue",
  },
  theme: {
    options: {
      dark: "Sombre",
      light: "Clair",
      system: "Système",
    },
  },
} as const;
