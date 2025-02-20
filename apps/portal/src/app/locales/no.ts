export default {
  auth: {
    title: "Ansattportal",
    description: "Skriv inn e-postadressen din for å motta et engangspassord.",
    options: "Flere alternativer",
    email: {
      otp_sent: "Engangspassord sendt",
      otp_description: "Sjekk e-posten din for engangspassordet",
      otp_try_again: "Prøv igjen",
      placeholder: "Din jobbmail",
      button: "Fortsett",
    },
  },
  powered_by: {
    title: "Comp AI - OSS Compliance Platform",
    description:
      "Bli SOC 2, ISO 27001 og GDPR-kompatibel på uker, ikke måneder. Åpen kildekode, umiddelbar registrering, gratis prøveperiode.",
    learn_more: "Start gratis prøveperiode og bli kompatibel",
    learn_more_link: "https://trycomp.ai",
  },
  user_menu: {
    theme: "Tema",
    language: "Språk",
    sign_out: "Logg ut",
  },
  not_found: {
    title: "Ikke funnet",
    description: "Siden du leter etter eksisterer ikke.",
    return: "Gå tilbake til hjemmesiden",
  },
  sidebar: {
    dashboard: "Oversikt over ansattportal",
  },
  language: {
    placeholder: "Velg språk",
  },
  theme: {
    options: {
      dark: "Mørk",
      light: "Lys",
      system: "System",
    },
  },
} as const;
