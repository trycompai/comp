export default {
  languages: {
    es: "Espagnol",
    fr: "Français",
    no: "Norvégien",
    pt: "Portugais",
    en: "Anglais"
  },
  language: {
    title: "Langues",
    description: "Changez la langue utilisée dans l'interface utilisateur.",
    placeholder: "Sélectionner la langue"
  },
  common: {
    actions: {
      save: "Enregistrer",
      edit: "Modifier",
      "delete": "Supprimer",
      cancel: "Annuler",
      clear: "Effacer",
      create: "Créer",
      send: "Envoyer",
      "return": "Retourner",
      success: "Succès",
      error: "Erreur",
      next: "Suivant",
      complete: "Terminer"
    },
    assignee: {
      label: "Assigné à",
      placeholder: "Sélectionner l'assigné"
    },
    date: {
      pick: "Choisir une date",
      due_date: "Date d'échéance"
    },
    status: {
      open: "Ouvert",
      pending: "En attente",
      closed: "Fermé",
      archived: "Archivé",
      compliant: "Conforme",
      non_compliant: "Non conforme",
      not_started: "Non commencé",
      in_progress: "En cours",
      published: "Publié",
      needs_review: "Besoin de révision",
      draft: "Brouillon",
      not_assessed: "Non évalué",
      assessed: "Évalué",
      active: "Actif",
      inactive: "Inactif"
    },
    filters: {
      clear: "Effacer les filtres",
      search: "Rechercher...",
      status: "Statut",
      department: "Département",
      owner: {
        label: "Assigné à",
        placeholder: "Filtrer par assigné"
      }
    },
    table: {
      title: "Titre",
      status: "Statut",
      assigned_to: "Assigné à",
      due_date: "Date d'échéance",
      last_updated: "Dernière mise à jour",
      no_results: "Aucun résultat trouvé"
    },
    empty_states: {
      no_results: {
        title: "Aucun résultat",
        title_tasks: "Aucune tâche trouvée",
        title_risks: "Aucun risque trouvé",
        description: "Essayez une autre recherche ou ajustez les filtres",
        description_filters: "Essayez une autre recherche ou ajustez les filtres",
        description_no_tasks: "Créez une tâche pour commencer",
        description_no_risks: "Créez un risque pour commencer"
      },
      no_items: {
        title: "Aucun élément trouvé",
        description: "Essayez d'ajuster votre recherche ou vos filtres"
      }
    },
    pagination: {
      of: "de",
      items_per_page: "Éléments par page",
      rows_per_page: "Lignes par page",
      page_x_of_y: "Page {{current}} sur {{total}}",
      go_to_first_page: "Aller à la première page",
      go_to_previous_page: "Aller à la page précédente",
      go_to_next_page: "Aller à la page suivante",
      go_to_last_page: "Aller à la dernière page"
    },
    comments: {
      title: "Commentaires",
      description: "Ajoutez un commentaire en utilisant le formulaire ci-dessous.",
      add: "Ajouter un commentaire",
      "new": "Nouveau commentaire",
      save: "Enregistrer le commentaire",
      success: "Commentaire ajouté avec succès",
      error: "Échec de l'ajout du commentaire",
      placeholder: "Écrivez votre commentaire ici...",
      empty: {
        title: "Aucun commentaire pour le moment",
        description: "Soyez le premier à ajouter un commentaire"
      }
    },
    attachments: {
      title: "Pièces jointes",
      description: "Ajoutez un fichier en cliquant sur 'Ajouter une pièce jointe'.",
      upload: "Télécharger une pièce jointe",
      upload_description: "Téléchargez une pièce jointe ou ajoutez un lien vers une ressource externe.",
      drop: "Déposez les fichiers ici",
      drop_description: "Déposez des fichiers ici ou cliquez pour choisir des fichiers sur votre appareil.",
      drop_files_description: "Les fichiers peuvent aller jusqu'à ",
      empty: {
        title: "Aucune pièce jointe",
        description: "Ajoutez un fichier en cliquant sur 'Ajouter une pièce jointe'."
      },
      toasts: {
        error: "Une erreur s'est produite, veuillez réessayer.",
        error_uploading_files: "Impossible de télécharger plus d'un fichier à la fois",
        error_uploading_files_multiple: "Impossible de télécharger plus de 10 fichiers",
        error_no_files_selected: "Aucun fichier sélectionné",
        error_file_rejected: "Le fichier {file} a été rejeté",
        error_failed_to_upload_files: "Échec du téléchargement des fichiers",
        error_failed_to_upload_files_multiple: "Échec du téléchargement des fichiers",
        error_failed_to_upload_files_single: "Échec du téléchargement du fichier",
        success_uploading_files: "Fichiers téléchargés avec succès",
        success_uploading_files_multiple: "Fichiers téléchargés avec succès",
        success_uploading_files_single: "Fichier téléchargé avec succès",
        success_uploading_files_target: "Fichiers téléchargés",
        uploading_files: "Téléchargement de {target}...",
        remove_file: "Supprimer le fichier"
      }
    },
    notifications: {
      inbox: "Boîte de réception",
      archive: "Archive",
      archive_all: "Archiver tout",
      no_notifications: "Aucune nouvelle notification"
    }
  },
  header: {
    discord: {
      button: "Rejoignez-nous sur Discord"
    },
    feedback: {
      button: "Retour d'information",
      title: "Merci pour vos retours !",
      description: "Nous reviendrons vers vous dès que possible",
      placeholder: "Idées pour améliorer cette page ou problèmes que vous rencontrez.",
      success: "Merci pour vos retours !",
      error: "Erreur lors de l'envoi du retour - réessayer ?",
      send: "Envoyer un retour"
    }
  },
  not_found: {
    title: "404 - Page non trouvée",
    description: "La page que vous recherchez n'existe pas.",
    "return": "Retour au tableau de bord"
  },
  theme: {
    options: {
      light: "Clair",
      dark: "Sombre",
      system: "Système"
    }
  },
  sidebar: {
    overview: "Aperçu",
    policies: "Politiques",
    risk: "Gestion des Risques",
    vendors: "Fournisseurs",
    integrations: "Intégrations",
    settings: "Paramètres",
    evidence: "Tâches de preuve",
    people: "Personnes"
  },
  auth: {
    title: "Automatisez la conformité SOC 2, ISO 27001 et RGPD avec l'IA.",
    description: "Créez un compte gratuit ou connectez-vous avec un compte existant pour continuer.",
    options: "Plus d'options",
    google: "Continuer avec Google",
    email: {
      description: "Entrez votre adresse e-mail pour continuer.",
      placeholder: "Entrez l'adresse e-mail",
      button: "Continuer avec l'e-mail",
      magic_link_sent: "Lien magique envoyé",
      magic_link_description: "Vérifiez votre boîte de réception pour un lien magique.",
      magic_link_try_again: "Réessayer.",
      success: "E-mail envoyé - vérifiez votre boîte de réception !",
      error: "Erreur lors de l'envoi de l'e-mail - réessayer ?"
    },
    terms: "En cliquant sur continuer, vous reconnaissez avoir lu et accepté les Conditions d'utilisation et la Politique de confidentialité."
  },
  onboarding: {
    title: "Créer une organisation",
    setup: "Configuration",
    description: "Parlez-nous un peu de votre organisation.",
    fields: {
      name: {
        label: "Nom de l'organisation",
        placeholder: "Le nom de votre organisation"
      },
      website: {
        label: "Site Web",
        placeholder: "Le site Web de votre organisation"
      },
      subdomain: {
        label: "Sous-domaine",
        placeholder: "exemple"
      },
      fullName: {
        label: "Votre Nom",
        placeholder: "Votre nom complet"
      }
    },
    success: "Merci, vous êtes prêt !",
    error: "Une erreur s'est produite, veuillez réessayer.",
    unavailable: "Indisponible",
    check_availability: "Vérification de la disponibilité",
    available: "Disponible"
  },
  overview: {
    title: "Aperçu",
    framework_chart: {
      title: "Progrès du cadre"
    },
    requirement_chart: {
      title: "État de conformité"
    }
  },
  policies: {
    dashboard: {
      title: "Tableau de bord",
      all: "Toutes les politiques",
      policy_status: "État de la politique",
      policies_by_assignee: "Politiques par responsable",
      policies_by_framework: "Politiques par cadre"
    },
    table: {
      name: "Nom de la politique",
      statuses: {
        draft: "Brouillon",
        published: "Publié"
      },
      filters: {
        owner: {
          label: "Responsable",
          placeholder: "Filtrer par responsable"
        }
      }
    },
    filters: {
      search: "Rechercher des politiques...",
      all: "Toutes les politiques"
    },
    status: {
      draft: "Brouillon",
      published: "Publié",
      needs_review: "Nécessite une révision"
    },
    policies: "politiques"
  },
  evidence_tasks: {
    evidence_tasks: "Tâches de preuve",
    overview: "Aperçu"
  },
  risk: {
    risks: "risques",
    overview: "Aperçu",
    create: "Créer un nouveau risque",
    vendor: {
      title: "Gestion des fournisseurs",
      dashboard: {
        title: "Tableau de bord des fournisseurs",
        overview: "Aperçu des fournisseurs",
        vendor_status: "État du fournisseur",
        vendor_category: "Catégories de fournisseurs",
        vendors_by_assignee: "Fournisseurs par responsable",
        inherent_risk_description: "Niveau de risque initial avant l'application de tout contrôle",
        residual_risk_description: "Niveau de risque restant après l'application des contrôles"
      },
      register: {
        title: "Registre des fournisseurs",
        table: {
          name: "Nom",
          category: "Catégorie",
          status: "Statut",
          owner: "Propriétaire"
        }
      },
      assessment: {
        title: "Évaluation des fournisseurs",
        update_success: "Évaluation du risque fournisseur mise à jour avec succès",
        update_error: "Échec de la mise à jour de l'évaluation du risque fournisseur",
        inherent_risk: "Risque inhérent",
        residual_risk: "Risque résiduel"
      },
      form: {
        vendor_details: "Détails du fournisseur",
        vendor_name: "Nom",
        vendor_name_placeholder: "Entrez le nom du fournisseur",
        vendor_website: "Site Web",
        vendor_website_placeholder: "Entrez le site Web du fournisseur",
        vendor_description: "Description",
        vendor_description_placeholder: "Entrez la description du fournisseur",
        vendor_category: "Catégorie",
        vendor_category_placeholder: "Sélectionnez une catégorie",
        vendor_status: "Statut",
        vendor_status_placeholder: "Sélectionnez un statut",
        create_vendor_success: "Fournisseur créé avec succès",
        create_vendor_error: "Échec de la création du fournisseur",
        update_vendor: "Mettre à jour le fournisseur",
        update_vendor_success: "Fournisseur mis à jour avec succès",
        update_vendor_error: "Échec de la mise à jour du fournisseur",
        add_comment: "Ajouter un commentaire"
      },
      table: {
        name: "Nom",
        category: "Catégorie",
        status: "Statut",
        owner: "Propriétaire"
      },
      filters: {
        search_placeholder: "Rechercher des fournisseurs...",
        status_placeholder: "Filtrer par statut",
        category_placeholder: "Filtrer par catégorie",
        owner_placeholder: "Filtrer par propriétaire"
      },
      empty_states: {
        no_vendors: {
          title: "Aucun fournisseur pour le moment",
          description: "Commencez par créer votre premier fournisseur"
        },
        no_results: {
          title: "Aucun résultat trouvé",
          description: "Aucun fournisseur ne correspond à votre recherche",
          description_with_filters: "Essayez d'ajuster vos filtres"
        }
      },
      actions: {
        create: "Créer un fournisseur"
      },
      status: {
        not_assessed: "Non évalué",
        in_progress: "En cours",
        assessed: "Évalué"
      },
      category: {
        cloud: "Cloud",
        infrastructure: "Infrastructure",
        software_as_a_service: "Logiciel en tant que service",
        finance: "Finance",
        marketing: "Marketing",
        sales: "Ventes",
        hr: "Ressources humaines",
        other: "Autre"
      },
      risk_level: {
        low: "Risque faible",
        medium: "Risque moyen",
        high: "Risque élevé",
        unknown: "Risque inconnu"
      }
    },
    dashboard: {
      title: "Tableau de bord",
      overview: "Aperçu des risques",
      risk_status: "Statut des risques",
      risks_by_department: "Risques par département",
      risks_by_assignee: "Risques par responsable",
      inherent_risk_description: "Le risque inhérent est calculé comme probabilité * impact. Calculé avant l'application de tout contrôle.",
      residual_risk_description: "Le risque résiduel est calculé comme probabilité * impact. C'est le niveau de risque après l'application des contrôles.",
      risk_assessment_description: "Comparer les niveaux de risque inhérent et résiduel"
    },
    register: {
      title: "Registre des risques",
      table: {
        risk: "Risque"
      },
      empty: {
        no_risks: {
          title: "Créez un risque pour commencer",
          description: "Suivez et évaluez les risques, créez et assignez des tâches d'atténuation à votre équipe, et gérez votre registre des risques dans une interface simple."
        },
        create_risk: "Créer un risque"
      }
    },
    metrics: {
      probability: "Probabilité",
      impact: "Impact",
      inherentRisk: "Risque inhérent",
      residualRisk: "Risque résiduel"
    },
    form: {
      update_inherent_risk: "Enregistrer le risque inhérent",
      update_inherent_risk_description: "Mettez à jour le risque inhérent du risque. C'est le niveau de risque avant l'application de tout contrôle.",
      update_inherent_risk_success: "Risque inhérent mis à jour avec succès",
      update_inherent_risk_error: "Échec de la mise à jour du risque inhérent",
      update_residual_risk: "Enregistrer le risque résiduel",
      update_residual_risk_description: "Mettez à jour le risque résiduel du risque. C'est le niveau de risque après l'application des contrôles.",
      update_residual_risk_success: "Risque résiduel mis à jour avec succès",
      update_residual_risk_error: "Échec de la mise à jour du risque résiduel",
      update_risk: "Mettre à jour le risque",
      update_risk_description: "Mettez à jour le titre ou la description du risque.",
      update_risk_success: "Risque mis à jour avec succès",
      update_risk_error: "Échec de la mise à jour du risque",
      create_risk_success: "Risque créé avec succès",
      create_risk_error: "Échec de la création du risque",
      risk_details: "Détails du risque",
      risk_title: "Titre du risque",
      risk_title_description: "Entrez un nom pour le risque",
      risk_description: "Description",
      risk_description_description: "Entrez une description pour le risque",
      risk_category: "Catégorie",
      risk_category_placeholder: "Sélectionnez une catégorie",
      risk_department: "Département",
      risk_department_placeholder: "Sélectionnez un département",
      risk_status: "Statut du risque",
      risk_status_placeholder: "Sélectionnez un statut de risque"
    },
    tasks: {
      title: "Tâches",
      attachments: "Pièces jointes",
      overview: "Aperçu des tâches",
      form: {
        title: "Détails de la tâche",
        task_title: "Titre de la tâche",
        status: "Statut de la tâche",
        status_placeholder: "Sélectionnez un statut de tâche",
        task_title_description: "Entrez un nom pour la tâche",
        description: "Description",
        description_description: "Entrez une description pour la tâche",
        due_date: "Date d'échéance",
        due_date_description: "Sélectionnez la date d'échéance pour la tâche",
        success: "Tâche créée avec succès",
        error: "Échec de la création de la tâche"
      },
      sheet: {
        title: "Créer une tâche",
        update: "Mettre à jour la tâche",
        update_description: "Mettez à jour le titre ou la description de la tâche."
      },
      empty: {
        description_create: "Créez une tâche d'atténuation pour ce risque, ajoutez un plan de traitement et assignez-le à un membre de l'équipe."
      }
    }
  },
  settings: {
    general: {
      title: "Général",
      org_name: "Nom de l'organisation",
      org_name_description: "Ceci est le nom visible de votre organisation. Vous devez utiliser le nom légal de votre organisation.",
      org_name_tip: "Veuillez utiliser un maximum de 32 caractères.",
      org_website: "Site Web de l'organisation",
      org_website_description: "Ceci est l'URL du site Web officiel de votre organisation. Assurez-vous d'inclure l'URL complète avec https://.",
      org_website_tip: "Veuillez entrer une URL valide incluant https://",
      org_website_error: "Erreur lors de la mise à jour du site Web de l'organisation",
      org_website_updated: "Site Web de l'organisation mis à jour",
      org_delete: "Supprimer l'organisation",
      org_delete_description: "Supprimez définitivement votre organisation et tout son contenu de la plateforme Comp AI. Cette action n'est pas réversible - veuillez continuer avec prudence.",
      org_delete_alert_title: "Êtes-vous absolument sûr ?",
      org_delete_alert_description: "Cette action ne peut pas être annulée. Cela supprimera définitivement votre organisation et retirera vos données de nos serveurs.",
      org_delete_error: "Erreur lors de la suppression de l'organisation",
      org_delete_success: "Organisation supprimée",
      org_name_updated: "Nom de l'organisation mis à jour",
      org_name_error: "Erreur lors de la mise à jour du nom de l'organisation",
      save_button: "Enregistrer",
      delete_button: "Supprimer",
      delete_confirm: "SUPPRIMER",
      delete_confirm_tip: "Tapez SUPPRIMER pour confirmer.",
      cancel_button: "Annuler"
    },
    members: {
      title: "Membres"
    },
    billing: {
      title: "Facturation"
    }
  },
  user_menu: {
    theme: "Thème",
    language: "Langue",
    sign_out: "Se déconnecter",
    account: "Compte",
    support: "Support",
    settings: "Paramètres",
    teams: "Équipes"
  },
  frameworks: {
    title: "Cadres",
    controls: {
      title: "Contrôles",
      description: "Examinez et gérez les contrôles de conformité",
      table: {
        status: "Statut",
        control: "Contrôle",
        artifacts: "Artifacts",
        actions: "Actions"
      },
      statuses: {
        not_started: "Non commencé",
        compliant: "Conforme",
        non_compliant: "Non conforme"
      }
    },
    overview: {
      error: "Échec du chargement des cadres",
      loading: "Chargement des cadres...",
      empty: {
        title: "Aucun cadre sélectionné",
        description: "Sélectionnez des cadres pour commencer votre parcours de conformité"
      },
      progress: {
        title: "Progression du cadre",
        empty: {
          title: "Aucun cadre pour le moment",
          description: "Commencez par ajouter un cadre de conformité pour suivre vos progrès",
          action: "Ajouter un cadre"
        }
      },
      grid: {
        welcome: {
          title: "Bienvenue dans Comp AI",
          description: "Commencez par sélectionner les cadres de conformité que vous souhaitez mettre en œuvre. Nous vous aiderons à gérer et à suivre votre parcours de conformité à travers plusieurs normes.",
          action: "Commencer"
        },
        title: "Sélectionner des cadres",
        version: "Version",
        actions: {
          clear: "Effacer",
          confirm: "Confirmer la sélection"
        }
      }
    }
  },
  vendor: {
    title: "Tableau de bord",
    register_title: "Gestion des fournisseurs",
    dashboard: {
      title: "Tableau de bord",
      overview: "Aperçu des fournisseurs",
      vendor_status: "Statut des fournisseurs",
      vendor_category: "Catégories de fournisseurs",
      vendors_by_assignee: "Fournisseurs par responsable",
      inherent_risk_description: "Niveau de risque initial avant l'application de tout contrôle",
      residual_risk_description: "Niveau de risque restant après l'application des contrôles"
    },
    register: {
      title: "Registre des fournisseurs",
      table: {
        name: "Nom",
        category: "Catégorie",
        status: "Statut",
        owner: "Propriétaire"
      }
    },
    category: {
      cloud: "Cloud",
      infrastructure: "Infrastructure",
      software_as_a_service: "SaaS",
      finance: "Finance",
      marketing: "Marketing",
      sales: "Ventes",
      hr: "RH",
      other: "Autre"
    },
    vendors: "fournisseurs",
    form: {
      vendor_details: "Détails du fournisseur",
      vendor_name: "Nom",
      vendor_name_placeholder: "Entrez le nom du fournisseur",
      vendor_website: "Site Web",
      vendor_website_placeholder: "Entrez le site Web du fournisseur",
      vendor_description: "Description",
      vendor_description_placeholder: "Entrez la description du fournisseur",
      vendor_category: "Catégorie",
      vendor_category_placeholder: "Sélectionnez une catégorie",
      vendor_status: "Statut",
      vendor_status_placeholder: "Sélectionnez un statut",
      create_vendor_success: "Fournisseur créé avec succès",
      create_vendor_error: "Échec de la création du fournisseur",
      update_vendor_success: "Fournisseur mis à jour avec succès",
      update_vendor_error: "Échec de la mise à jour du fournisseur",
      contacts: "Contacts du fournisseur",
      contact_name: "Nom du contact",
      contact_email: "Email du contact",
      contact_role: "Rôle du contact",
      add_contact: "Ajouter un contact",
      new_contact: "Nouveau contact",
      min_one_contact_required: "Un fournisseur doit avoir au moins un contact"
    },
    empty_states: {
      no_vendors: {
        title: "Aucun fournisseur pour le moment",
        description: "Commencez par créer votre premier fournisseur"
      },
      no_results: {
        title: "Aucun résultat trouvé",
        description: "Aucun fournisseur ne correspond à votre recherche",
        description_with_filters: "Essayez d'ajuster vos filtres"
      }
    }
  },
  people: {
    title: "Personnes",
    details: {
      taskProgress: "Progression des tâches",
      tasks: "Tâches",
      noTasks: "Aucune tâche assignée pour le moment"
    },
    description: "Gérez vos membres d'équipe et leurs rôles.",
    filters: {
      search: "Rechercher des personnes...",
      role: "Filtrer par rôle"
    },
    actions: {
      invite: "Ajouter un employé",
      clear: "Effacer les filtres"
    },
    table: {
      name: "Nom",
      email: "Email",
      department: "Département",
      externalId: "ID externe"
    },
    empty: {
      no_employees: {
        title: "Aucun employé pour le moment",
        description: "Commencez par inviter votre premier membre d'équipe."
      },
      no_results: {
        title: "Aucun résultat trouvé",
        description: "Aucun employé ne correspond à votre recherche",
        description_with_filters: "Essayez d'ajuster vos filtres"
      }
    },
    invite: {
      title: "Ajouter un employé",
      description: "Ajoutez un employé à votre organisation.",
      email: {
        label: "Adresse e-mail",
        placeholder: "Entrez l'adresse e-mail"
      },
      role: {
        label: "Rôle",
        placeholder: "Sélectionnez un rôle"
      },
      name: {
        label: "Nom",
        placeholder: "Entrez le nom"
      },
      department: {
        label: "Département",
        placeholder: "Sélectionnez un département"
      },
      submit: "Ajouter un employé",
      success: "Employé ajouté avec succès",
      error: "Échec de l'ajout de l'employé"
    }
  },
  errors: {
    unexpected: "Une erreur s'est produite, veuillez réessayer"
  },
  sub_pages: {
    risk: {
      overview: "Gestion des Risques",
      register: "Registre des Risques",
      risk_overview: "Aperçu des Risques",
      risk_comments: "Commentaires sur les Risques",
      tasks: {
        task_overview: "Aperçu des Tâches"
      }
    },
    policies: {
      all: "Toutes les Politiques",
      editor: "Éditeur de Politique"
    },
    people: {
      all: "Personnes",
      employee_details: "Détails de l'Employé"
    },
    settings: {
      members: "Membres de l'Équipe"
    },
    frameworks: {
      overview: "Cadres"
    }
  }
} as const;
