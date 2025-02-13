export default {
  languages: {
    es: "Spansk",
    fr: "Fransk",
    no: "Norsk",
    pt: "Portugisisk",
    en: "Engelsk"
  },
  language: {
    title: "Språk",
    description: "Endre språket som brukes i brukergrensesnittet.",
    placeholder: "Velg språk"
  },
  common: {
    actions: {
      save: "Lagre",
      edit: "Rediger",
      "delete": "Slett",
      cancel: "Avbryt",
      clear: "Tøm",
      create: "Opprett",
      send: "Send",
      "return": "Tilbake",
      success: "Suksess",
      error: "Feil",
      next: "Neste",
      complete: "Fullfør"
    },
    assignee: {
      label: "Tildelt",
      placeholder: "Velg tildelt"
    },
    date: {
      pick: "Velg en dato",
      due_date: "Forfallsdato"
    },
    status: {
      open: "Åpen",
      pending: "Venter",
      closed: "Lukket",
      archived: "Arkivert",
      compliant: "I samsvar",
      non_compliant: "Ikke i samsvar",
      not_started: "Ikke startet",
      in_progress: "Pågår",
      published: "Publisert",
      needs_review: "Trenger vurdering",
      draft: "Utkast",
      not_assessed: "Ikke vurdert",
      assessed: "Vurdert",
      active: "Aktiv",
      inactive: "Inaktiv"
    },
    filters: {
      clear: "Tøm filtre",
      search: "Søk...",
      status: "Status",
      department: "Avdeling",
      owner: {
        label: "Tildelt",
        placeholder: "Filtrer etter tildelt"
      }
    },
    table: {
      title: "Tittel",
      status: "Status",
      assigned_to: "Tildelt Til",
      due_date: "Forfallsdato",
      last_updated: "Sist oppdatert",
      no_results: "Ingen resultater funnet"
    },
    empty_states: {
      no_results: {
        title: "Ingen resultater",
        title_tasks: "Ingen oppgaver funnet",
        title_risks: "Ingen risikoer funnet",
        description: "Prøv et annet søk, eller juster filtrene",
        description_filters: "Prøv et annet søk, eller juster filtrene",
        description_no_tasks: "Opprett en oppgave for å komme i gang",
        description_no_risks: "Opprett en risiko for å komme i gang"
      },
      no_items: {
        title: "Ingen elementer funnet",
        description: "Prøv å justere søket eller filtrene"
      }
    },
    pagination: {
      of: "av",
      items_per_page: "Elementer per side",
      rows_per_page: "Rader per side",
      page_x_of_y: "Side {{current}} av {{total}}",
      go_to_first_page: "Gå til første side",
      go_to_previous_page: "Gå til forrige side",
      go_to_next_page: "Gå til neste side",
      go_to_last_page: "Gå til siste side"
    },
    comments: {
      title: "Kommentarer",
      description: "Legg til en kommentar ved å bruke skjemaet nedenfor.",
      add: "Legg til kommentar",
      "new": "Ny kommentar",
      save: "Lagre kommentar",
      success: "Kommentar lagt til",
      error: "Kunne ikke legge til kommentar",
      placeholder: "Skriv din kommentar her...",
      empty: {
        title: "Ingen kommentarer ennå",
        description: "Vær den første til å legge til en kommentar"
      }
    },
    attachments: {
      title: "Vedlegg",
      description: "Legg til en fil ved å klikke på 'Legg til vedlegg'.",
      upload: "Last opp et vedlegg",
      upload_description: "Last opp et vedlegg eller legg til en lenke til en ekstern ressurs.",
      drop: "Slipp filene her",
      drop_description: "Slipp filer her eller klikk for å velge filer fra enheten din.",
      drop_files_description: "Filer kan være opptil ",
      empty: {
        title: "Ingen vedlegg",
        description: "Legg til en fil ved å klikke på 'Legg til vedlegg'."
      },
      toasts: {
        error: "Noe gikk galt, vennligst prøv igjen.",
        error_uploading_files: "Kan ikke laste opp mer enn 1 fil om gangen",
        error_uploading_files_multiple: "Kan ikke laste opp mer enn 10 filer",
        error_no_files_selected: "Ingen filer valgt",
        error_file_rejected: "Fil {file} ble avvist",
        error_failed_to_upload_files: "Kunne ikke laste opp filer",
        error_failed_to_upload_files_multiple: "Kunne ikke laste opp filer",
        error_failed_to_upload_files_single: "Kunne ikke laste opp fil",
        success_uploading_files: "Filer lastet opp",
        success_uploading_files_multiple: "Filer lastet opp",
        success_uploading_files_single: "Fil lastet opp",
        success_uploading_files_target: "Filer lastet opp",
        uploading_files: "Laster opp {target}...",
        remove_file: "Fjern fil"
      }
    },
    notifications: {
      inbox: "Innboks",
      archive: "Arkiv",
      archive_all: "Arkiver alt",
      no_notifications: "Ingen nye varsler"
    }
  },
  header: {
    discord: {
      button: "Bli med oss på Discord"
    },
    feedback: {
      button: "Tilbakemelding",
      title: "Takk for tilbakemeldingen!",
      description: "Vi kommer tilbake til deg så snart som mulig",
      placeholder: "Ideer for å forbedre denne siden eller problemer du opplever.",
      success: "Takk for tilbakemeldingen!",
      error: "Feil ved sending av tilbakemelding - prøv igjen?",
      send: "Send tilbakemelding"
    }
  },
  not_found: {
    title: "404 - Siden ble ikke funnet",
    description: "Siden du leter etter eksisterer ikke.",
    "return": "Gå tilbake til dashbordet"
  },
  theme: {
    options: {
      light: "Lys",
      dark: "Mørk",
      system: "System"
    }
  },
  sidebar: {
    overview: "Oversikt",
    policies: "Retningslinjer",
    risk: "Risikoledelse",
    vendors: "Leverandører",
    integrations: "Integrasjoner",
    settings: "Innstillinger",
    evidence: "Bevisoppgaver",
    people: "Personer"
  },
  auth: {
    title: "Automatiser SOC 2, ISO 27001 og GDPR-overholdelse med AI.",
    description: "Opprett en gratis konto eller logg inn med en eksisterende konto for å fortsette.",
    options: "Flere alternativer",
    google: "Fortsett med Google",
    email: {
      description: "Skriv inn e-postadressen din for å fortsette.",
      placeholder: "Skriv inn e-postadresse",
      button: "Fortsett med e-post",
      magic_link_sent: "Magisk lenke sendt",
      magic_link_description: "Sjekk innboksen din for en magisk lenke.",
      magic_link_try_again: "Prøv igjen.",
      success: "E-post sendt - sjekk innboksen din!",
      error: "Feil ved sending av e-post - prøv igjen?"
    },
    terms: "Ved å klikke på fortsett, bekrefter du at du har lest og godtar vilkårene for bruk og personvernerklæringen."
  },
  onboarding: {
    title: "Opprett en organisasjon",
    setup: "Oppsett",
    description: "Fortell oss litt om organisasjonen din.",
    fields: {
      name: {
        label: "Organisasjonsnavn",
        placeholder: "Ditt organisasjonsnavn"
      },
      website: {
        label: "Nettsted",
        placeholder: "Ditt organisasjonsnettsted"
      },
      subdomain: {
        label: "Underdomene",
        placeholder: "eksempel"
      },
      fullName: {
        label: "Ditt navn",
        placeholder: "Ditt fulle navn"
      }
    },
    success: "Takk, du er klar!",
    error: "Noe gikk galt, vennligst prøv igjen.",
    unavailable: "Ikke tilgjengelig",
    check_availability: "Sjekker tilgjengelighet",
    available: "Tilgjengelig"
  },
  overview: {
    title: "Oversikt",
    framework_chart: {
      title: "Rammeverk Fremdrift"
    },
    requirement_chart: {
      title: "Overholdelsesstatus"
    }
  },
  policies: {
    dashboard: {
      title: "Dashbord",
      all: "Alle retningslinjer",
      policy_status: "Retningslinjestatus",
      policies_by_assignee: "Retningslinjer etter tildelt",
      policies_by_framework: "Retningslinjer etter rammeverk"
    },
    table: {
      name: "Retningslinjenavn",
      statuses: {
        draft: "Utkast",
        published: "Publisert"
      },
      filters: {
        owner: {
          label: "Tildelt",
          placeholder: "Filtrer etter tildelt"
        }
      }
    },
    filters: {
      search: "Søk etter retningslinjer...",
      all: "Alle retningslinjer"
    },
    status: {
      draft: "Utkast",
      published: "Publisert",
      needs_review: "Trenger gjennomgang"
    },
    policies: "retningslinjer"
  },
  evidence_tasks: {
    evidence_tasks: "Bevisoppgaver",
    overview: "Oversikt"
  },
  risk: {
    risks: "risikoer",
    overview: "Oversikt",
    create: "Opprett ny risiko",
    vendor: {
      title: "Leverandøradministrasjon",
      dashboard: {
        title: "Leverandørdashbord",
        overview: "Leverandøroversikt",
        vendor_status: "Leverandørstatus",
        vendor_category: "Leverandørkategorier",
        vendors_by_assignee: "Leverandører etter tildelt",
        inherent_risk_description: "Innledende risikonivå før noen kontroller er anvendt",
        residual_risk_description: "Gjenstående risikonivå etter at kontroller er anvendt"
      },
      register: {
        title: "Leverandørregister",
        table: {
          name: "Navn",
          category: "Kategori",
          status: "Status",
          owner: "Eier"
        }
      },
      assessment: {
        title: "Leverandørvurdering",
        update_success: "Leverandørvurdering oppdatert vellykket",
        update_error: "Feil ved oppdatering av leverandørvurdering",
        inherent_risk: "Inherent risiko",
        residual_risk: "Gjenstående risiko"
      },
      form: {
        vendor_details: "Leverandørdetaljer",
        vendor_name: "Navn",
        vendor_name_placeholder: "Skriv inn leverandørnavn",
        vendor_website: "Nettsted",
        vendor_website_placeholder: "Skriv inn leverandørnettsted",
        vendor_description: "Beskrivelse",
        vendor_description_placeholder: "Skriv inn leverandørbeskrivelse",
        vendor_category: "Kategori",
        vendor_category_placeholder: "Velg kategori",
        vendor_status: "Status",
        vendor_status_placeholder: "Velg status",
        create_vendor_success: "Leverandør opprettet vellykket",
        create_vendor_error: "Feil ved oppretting av leverandør",
        update_vendor: "Oppdater Leverandør",
        update_vendor_success: "Leverandør oppdatert",
        update_vendor_error: "Kunne ikke oppdatere leverandør",
        add_comment: "Legg til Kommentar"
      },
      table: {
        name: "Navn",
        category: "Kategori",
        status: "Status",
        owner: "Eier"
      },
      filters: {
        search_placeholder: "Søk etter leverandører...",
        status_placeholder: "Filtrer etter status",
        category_placeholder: "Filtrer etter kategori",
        owner_placeholder: "Filtrer etter eier"
      },
      empty_states: {
        no_vendors: {
          title: "Ingen leverandører ennå",
          description: "Kom i gang med å opprette din første leverandør"
        },
        no_results: {
          title: "Ingen resultater funnet",
          description: "Ingen leverandører matcher søket ditt",
          description_with_filters: "Prøv å justere filtrene dine"
        }
      },
      actions: {
        create: "Opprett Leverandør"
      },
      status: {
        not_assessed: "Ikke Vurdert",
        in_progress: "Under Behandling",
        assessed: "Vurdert"
      },
      category: {
        cloud: "Sky",
        infrastructure: "Infrastruktur",
        software_as_a_service: "Programvare som en Tjeneste",
        finance: "Finans",
        marketing: "Markedsføring",
        sales: "Salg",
        hr: "HR",
        other: "Annet"
      },
      risk_level: {
        low: "Lav Risiko",
        medium: "Moderat Risiko",
        high: "Høy Risiko",
        unknown: "Ukjent Risiko"
      }
    },
    dashboard: {
      title: "Dashbord",
      overview: "Risikooversikt",
      risk_status: "Risiko Status",
      risks_by_department: "Risikoer etter Avdeling",
      risks_by_assignee: "Risikoer etter Tildelt",
      inherent_risk_description: "Inherent risiko beregnes som sannsynlighet * påvirkning. Beregnet før noen kontroller er anvendt.",
      residual_risk_description: "Residual risiko beregnes som sannsynlighet * påvirkning. Dette er risikonivået etter at kontroller er anvendt.",
      risk_assessment_description: "Sammenlign inherent og residual risikonivåer"
    },
    register: {
      title: "Risiko Register",
      table: {
        risk: "Risiko"
      },
      empty: {
        no_risks: {
          title: "Opprett en risiko for å komme i gang",
          description: "Følg med på og vurder risikoer, opprett og tildel tiltak for teamet ditt, og administrer risiko registeret ditt i ett enkelt grensesnitt."
        },
        create_risk: "Opprett en risiko"
      }
    },
    metrics: {
      probability: "Sannsynlighet",
      impact: "Påvirkning",
      inherentRisk: "Inherent Risiko",
      residualRisk: "Residual Risiko"
    },
    form: {
      update_inherent_risk: "Lagre Inherent Risiko",
      update_inherent_risk_description: "Oppdater den inherent risikoen for risikoen. Dette er risikonivået før noen kontroller er anvendt.",
      update_inherent_risk_success: "Inherent risiko oppdatert",
      update_inherent_risk_error: "Kunne ikke oppdatere inherent risiko",
      update_residual_risk: "Lagre Residual Risiko",
      update_residual_risk_description: "Oppdater den residual risikoen for risikoen. Dette er risikonivået etter at kontroller er anvendt.",
      update_residual_risk_success: "Residual risiko oppdatert",
      update_residual_risk_error: "Kunne ikke oppdatere residual risiko",
      update_risk: "Oppdater Risiko",
      update_risk_description: "Oppdater risikotittelen eller beskrivelsen.",
      update_risk_success: "Risiko oppdatert",
      update_risk_error: "Kunne ikke oppdatere risiko",
      create_risk_success: "Risiko opprettet",
      create_risk_error: "Kunne ikke opprette risiko",
      risk_details: "Risiko Detaljer",
      risk_title: "Risiko Tittel",
      risk_title_description: "Skriv inn et navn for risikoen",
      risk_description: "Beskrivelse",
      risk_description_description: "Skriv inn en beskrivelse for risikoen",
      risk_category: "Kategori",
      risk_category_placeholder: "Velg en kategori",
      risk_department: "Avdeling",
      risk_department_placeholder: "Velg en avdeling",
      risk_status: "Risiko Status",
      risk_status_placeholder: "Velg en risikostatus"
    },
    tasks: {
      title: "Oppgaver",
      attachments: "Vedlegg",
      overview: "Oppgaveoversikt",
      form: {
        title: "Oppgave Detaljer",
        task_title: "Oppgave Tittel",
        status: "Oppgave Status",
        status_placeholder: "Velg en oppgavestatus",
        task_title_description: "Skriv inn et navn for oppgaven",
        description: "Beskrivelse",
        description_description: "Skriv inn en beskrivelse for oppgaven",
        due_date: "Forfallsdato",
        due_date_description: "Velg forfallsdato for oppgaven",
        success: "Oppgave opprettet",
        error: "Kunne ikke opprette oppgave"
      },
      sheet: {
        title: "Opprett Oppgave",
        update: "Oppdater Oppgave",
        update_description: "Oppdater oppgavetittelen eller beskrivelsen."
      },
      empty: {
        description_create: "Opprett en tiltakoppgave for denne risikoen, legg til en behandlingsplan, og tildel den til et teammedlem."
      }
    }
  },
  settings: {
    general: {
      title: "Generelt",
      org_name: "Organisasjonsnavn",
      org_name_description: "Dette er organisasjonens synlige navn. Du bør bruke det juridiske navnet på organisasjonen din.",
      org_name_tip: "Vennligst bruk maks 32 tegn.",
      org_website: "Organisasjonsnettsted",
      org_website_description: "Dette er organisasjonens offisielle nettsted-URL. Sørg for å inkludere hele URL-en med https://.",
      org_website_tip: "Vennligst skriv inn en gyldig URL inkludert https://",
      org_website_error: "Feil ved oppdatering av organisasjonsnettsted",
      org_website_updated: "Organisasjonsnettsted oppdatert",
      org_delete: "Slett organisasjon",
      org_delete_description: "Fjern organisasjonen din og alt innhold permanent fra Comp AI-plattformen. Denne handlingen kan ikke angres - vennligst fortsett med forsiktighet.",
      org_delete_alert_title: "Er du helt sikker?",
      org_delete_alert_description: "Denne handlingen kan ikke angres. Dette vil permanent slette organisasjonen din og fjerne dataene dine fra våre servere.",
      org_delete_error: "Feil ved sletting av organisasjon",
      org_delete_success: "Organisasjon slettet",
      org_name_updated: "Organisasjonsnavn oppdatert",
      org_name_error: "Feil ved oppdatering av organisasjonsnavn",
      save_button: "Lagre",
      delete_button: "Slett",
      delete_confirm: "SLETT",
      delete_confirm_tip: "Skriv SLETT for å bekrefte.",
      cancel_button: "Avbryt"
    },
    members: {
      title: "Medlemmer"
    },
    billing: {
      title: "Fakturering"
    }
  },
  user_menu: {
    theme: "Tema",
    language: "Språk",
    sign_out: "Logg ut",
    account: "Konto",
    support: "Støtte",
    settings: "Innstillinger",
    teams: "Team"
  },
  frameworks: {
    title: "Rammeverk",
    controls: {
      title: "Kontroller",
      description: "Gå gjennom og administrer samsvarskontroller",
      table: {
        status: "Status",
        control: "Kontroll",
        artifacts: "Artefakter",
        actions: "Handlinger"
      },
      statuses: {
        not_started: "Ikke startet",
        compliant: "Samsvarende",
        non_compliant: "Ikke samsvarende"
      }
    },
    overview: {
      error: "Kunne ikke laste rammeverk",
      loading: "Laster rammeverk...",
      empty: {
        title: "Ingen rammeverk valgt",
        description: "Velg rammeverk for å komme i gang med din samsvarsreise"
      },
      progress: {
        title: "Rammeverksprogresjon",
        empty: {
          title: "Ingen rammeverk ennå",
          description: "Kom i gang ved å legge til et samsvarsrammeverk for å spore fremgangen din",
          action: "Legg til rammeverk"
        }
      },
      grid: {
        welcome: {
          title: "Velkommen til Comp AI",
          description: "Kom i gang ved å velge samsvarsrammeverkene du ønsker å implementere. Vi hjelper deg med å administrere og spore samsvarsreisen din på tvers av flere standarder.",
          action: "Kom i gang"
        },
        title: "Velg rammeverk",
        version: "Versjon",
        actions: {
          clear: "Tøm",
          confirm: "Bekreft valg"
        }
      }
    }
  },
  vendor: {
    title: "Dashbord",
    register_title: "Leverandøradministrasjon",
    dashboard: {
      title: "Dashbord",
      overview: "Leverandøroversikt",
      vendor_status: "Leverandørstatus",
      vendor_category: "Leverandørkategorier",
      vendors_by_assignee: "Leverandører etter tildelt",
      inherent_risk_description: "Innledende risikonivå før noen kontroller er anvendt",
      residual_risk_description: "Gjenstående risikonivå etter at kontroller er anvendt"
    },
    register: {
      title: "Leverandørregister",
      table: {
        name: "Navn",
        category: "Kategori",
        status: "Status",
        owner: "Eier"
      }
    },
    category: {
      cloud: "Sky",
      infrastructure: "Infrastruktur",
      software_as_a_service: "SaaS",
      finance: "Finans",
      marketing: "Markedsføring",
      sales: "Salg",
      hr: "HR",
      other: "Annet"
    },
    vendors: "leverandører",
    form: {
      vendor_details: "Leverandørdetaljer",
      vendor_name: "Navn",
      vendor_name_placeholder: "Skriv inn leverandørnavn",
      vendor_website: "Nettsted",
      vendor_website_placeholder: "Skriv inn leverandørnettsted",
      vendor_description: "Beskrivelse",
      vendor_description_placeholder: "Skriv inn leverandørbeskrivelse",
      vendor_category: "Kategori",
      vendor_category_placeholder: "Velg kategori",
      vendor_status: "Status",
      vendor_status_placeholder: "Velg status",
      create_vendor_success: "Leverandør opprettet",
      create_vendor_error: "Kunne ikke opprette leverandør",
      update_vendor_success: "Leverandør oppdatert",
      update_vendor_error: "Kunne ikke oppdatere leverandør",
      contacts: "Leverandørkontakter",
      contact_name: "Kontaktpersonens navn",
      contact_email: "Kontaktpersonens e-post",
      contact_role: "Kontaktpersonens rolle",
      add_contact: "Legg til kontakt",
      new_contact: "Ny kontakt",
      min_one_contact_required: "En leverandør må ha minst én kontakt"
    },
    empty_states: {
      no_vendors: {
        title: "Ingen leverandører ennå",
        description: "Kom i gang med å opprette din første leverandør"
      },
      no_results: {
        title: "Ingen resultater funnet",
        description: "Ingen leverandører samsvarer med søket ditt",
        description_with_filters: "Prøv å justere filtrene dine"
      }
    }
  },
  people: {
    title: "Personer",
    details: {
      taskProgress: "Oppgavefremdrift",
      tasks: "Oppgaver",
      noTasks: "Ingen oppgaver tildelt ennå"
    },
    description: "Administrer teammedlemmene dine og deres roller.",
    filters: {
      search: "Søk etter personer...",
      role: "Filtrer etter rolle"
    },
    actions: {
      invite: "Legg til ansatt",
      clear: "Fjern filtre"
    },
    table: {
      name: "Navn",
      email: "E-post",
      department: "Avdeling",
      externalId: "Ekstern ID"
    },
    empty: {
      no_employees: {
        title: "Ingen ansatte ennå",
        description: "Kom i gang med å invitere ditt første teammedlem."
      },
      no_results: {
        title: "Ingen resultater funnet",
        description: "Ingen ansatte samsvarer med søket ditt",
        description_with_filters: "Prøv å justere filtrene dine"
      }
    },
    invite: {
      title: "Legg til ansatt",
      description: "Legg til en ansatt i organisasjonen din.",
      email: {
        label: "E-postadresse",
        placeholder: "Skriv inn e-postadresse"
      },
      role: {
        label: "Rolle",
        placeholder: "Velg en rolle"
      },
      name: {
        label: "Navn",
        placeholder: "Skriv inn navn"
      },
      department: {
        label: "Avdeling",
        placeholder: "Velg en avdeling"
      },
      submit: "Legg til ansatt",
      success: "Ansatt lagt til",
      error: "Kunne ikke legge til ansatt"
    }
  },
  errors: {
    unexpected: "Noe gikk galt, vennligst prøv igjen"
  },
  sub_pages: {
    risk: {
      overview: "Risikoledelse",
      register: "Risiko-register",
      risk_overview: "Risikooversikt",
      risk_comments: "Risiko-kommentarer",
      tasks: {
        task_overview: "Oppgaveoversikt"
      }
    },
    policies: {
      all: "Alle retningslinjer",
      editor: "Retningslinje-redigerer"
    },
    people: {
      all: "Personer",
      employee_details: "Ansattdetaljer"
    },
    settings: {
      members: "Teammedlemmer"
    },
    frameworks: {
      overview: "Rammeverk"
    }
  }
} as const;
