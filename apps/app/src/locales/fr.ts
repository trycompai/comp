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
    description: "Changer la langue utilisée dans l'interface utilisateur.",
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
      complete: "Compléter",
      addNew: "Ajouter nouveau"
    },
    assignee: {
      label: "Assigné",
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
      inactive: "Inactif",
      title: "Statut"
    },
    filters: {
      clear: "Effacer les filtres",
      search: "Recherche...",
      status: "Statut",
      department: "Département",
      owner: {
        label: "Assigné",
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
        title: "Aucun résultat trouvé",
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
      add: "Nouveau commentaire",
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
      upload: "Télécharger la pièce jointe",
      upload_description: "Téléchargez une pièce jointe ou ajoutez un lien vers une ressource externe.",
      drop: "Déposez les fichiers ici",
      drop_description: "Déposez des fichiers ici ou cliquez pour choisir des fichiers depuis votre appareil.",
      drop_files_description: "Les fichiers peuvent faire jusqu'à ",
      empty: {
        title: "Aucune pièce jointe",
        description: "Ajoutez un fichier en cliquant sur 'Ajouter une pièce jointe'."
      },
      toasts: {
        error: "Quelque chose a mal tourné, veuillez réessayer.",
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
    },
    edit: "Modifier",
    errors: {
      unexpected_error: "Une erreur inattendue est survenue"
    },
    description: "Description",
    last_updated: "Dernière mise à jour",
    frequency: {
      daily: "Quotidien",
      weekly: "Hebdomadaire",
      monthly: "Mensuel",
      quarterly: "Trimestriel",
      yearly: "Annuel"
    },
    upload: {
      fileUpload: {
        uploadingText: "Téléchargement...",
        uploadingFile: "Téléchargement du fichier...",
        dropFileHere: "Déposez le fichier ici",
        dropFileHereAlt: "Déposez le fichier ici",
        releaseToUpload: "Relâchez pour télécharger",
        addFiles: "Ajouter des fichiers",
        uploadAdditionalEvidence: "Téléchargez un fichier ou un document",
        dragDropOrClick: "Faites glisser et déposez ou cliquez pour parcourir",
        dragDropOrClickToSelect: "Faites glisser et déposez ou cliquez pour sélectionner le fichier",
        maxFileSize: "Taille maximale du fichier : {size} Mo"
      },
      fileUrl: {
        additionalLinks: "Liens supplémentaires",
        add: "Ajouter",
        linksAdded: "{count} lien{s} ajouté{s}",
        enterUrl: "Entrez l'URL",
        addAnotherLink: "Ajouter un autre lien",
        saveLinks: "Enregistrer les liens",
        urlBadge: "URL",
        copyLink: "Copier le lien",
        openLink: "Ouvrir le lien",
        deleteLink: "Supprimer le lien"
      },
      fileCard: {
        preview: "Aperçu",
        filePreview: "Aperçu du fichier : {fileName}",
        previewNotAvailable: "Aperçu non disponible pour ce type de fichier",
        openFile: "Ouvrir le fichier",
        deleteFile: "Supprimer le fichier",
        deleteFileConfirmTitle: "Supprimer le fichier",
        deleteFileConfirmDescription: "Cette action ne peut pas être annulée. Le fichier sera définitivement supprimé."
      },
      fileSection: {
        filesUploaded: "{count} fichiers téléchargés"
      }
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
      error: "Erreur lors de l'envoi des retours - réessayer ?",
      send: "Envoyer des retours"
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
    risk: "Gestion des risques",
    vendors: "Fournisseurs",
    integrations: "Intégrations",
    settings: "Paramètres",
    evidence: "Tâches de preuve",
    people: "Personnes",
    tests: "Tests Cloud"
  },
  auth: {
    title: "Automatisez la conformité SOC 2, ISO 27001 et RGPD avec l'IA.",
    description: "Créez un compte gratuit ou connectez-vous avec un compte existant pour continuer.",
    options: "Plus d'options",
    google: "Continuer avec Google",
    email: {
      description: "Entrez votre adresse e-mail pour continuer.",
      placeholder: "Entrer l'adresse e-mail",
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
    setup: "Bienvenue dans Comp AI",
    description: "Parlez-nous un peu de votre organisation et des cadres avec lesquels vous souhaitez commencer.",
    fields: {
      name: {
        label: "Nom de l'organisation",
        placeholder: "Le nom de votre organisation"
      },
      website: {
        label: "Site web",
        placeholder: "Le site web de votre organisation"
      },
      subdomain: {
        label: "Sous-domaine",
        placeholder: "exemple"
      },
      fullName: {
        label: "Votre nom",
        placeholder: "Votre nom complet"
      }
    },
    success: "Merci, vous êtes prêt !",
    error: "Quelque chose s'est mal passé, veuillez réessayer.",
    unavailable: "Indisponible",
    check_availability: "Vérification de la disponibilité",
    available: "Disponible",
    submit: "Terminez la configuration",
    trigger: {
      title: "Patientez, nous créons votre organisation",
      creating: "Cela peut prendre une minute ou deux...",
      completed: "Organisation créée avec succès",
      "continue": "Continuer vers le tableau de bord",
      error: "Une erreur s'est produite, veuillez réessayer."
    },
    creating: "Création de votre organisation...",
    "switch": "Changement d'organisation..."
  },
  overview: {
    title: "Aperçu",
    framework_chart: {
      title: "Progrès du cadre"
    },
    requirement_chart: {
      title: "Statut de conformité"
    }
  },
  policies: {
    dashboard: {
      title: "Tableau de bord",
      all: "Toutes les politiques",
      policy_status: "Politique par statut",
      policies_by_assignee: "Politiques par responsable",
      policies_by_framework: "Politiques par cadre",
      sub_pages: {
        overview: "Aperçu",
        edit_policy: "Modifier la politique"
      }
    },
    table: {
      name: "Nom de la politique",
      statuses: {
        draft: "Brouillon",
        published: "Publié",
        archived: "Archivé"
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
      needs_review: "Besoin de révision",
      archived: "Archivé",
      relevant: "Pertinent",
      "not-relevant": "Non pertinent"
    },
    policies: "politiques",
    title: "Politiques",
    create_new: "Créer une nouvelle politique",
    search_placeholder: "Rechercher des politiques...",
    status_filter: "Filtrer par statut",
    all_statuses: "Tous les statuts",
    no_policies_title: "Aucune politique pour le moment",
    no_policies_description: "Commencez par créer votre première politique",
    create_first: "Créer la première politique",
    no_description: "Aucune description fournie",
    last_updated: "Dernière mise à jour : {{date}}",
    save: "Enregistrer",
    saving: "Enregistrement...",
    saved_success: "Politique enregistrée avec succès",
    saved_error: "Échec de l'enregistrement de la politique",
    overview: {
      title: "Aperçu de la politique",
      form: {
        update_policy: "Mettre à jour la politique",
        update_policy_description: "Mettez à jour le titre ou la description de la politique.",
        update_policy_success: "Politique mise à jour avec succès",
        update_policy_error: "Échec de la mise à jour de la politique",
        update_policy_title: "Nom de la politique",
        review_frequency: "Fréquence de révision",
        review_frequency_placeholder: "Sélectionnez une fréquence de révision",
        review_date: "Date de révision",
        review_date_placeholder: "Sélectionnez une date de révision",
        required_to_sign: "Doit être signé par les employés",
        signature_required: "Exiger la signature des employés",
        signature_not_required: "Ne pas demander aux employés de signer",
        signature_requirement: "Exigence de signature",
        signature_requirement_placeholder: "Sélectionner l'exigence de signature"
      }
    },
    "new": {
      success: "Politique créée avec succès",
      error: "Échec de la création de la politique",
      details: "Détails de la politique",
      title: "Entrez un titre pour la politique",
      description: "Entrez une description pour la politique"
    }
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
        vendor_status: "Statut du fournisseur",
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
        vendor_website: "Site web",
        vendor_website_placeholder: "Entrez le site web du fournisseur",
        vendor_description: "Description",
        vendor_description_placeholder: "Entrez la description du fournisseur",
        vendor_category: "Catégorie",
        vendor_category_placeholder: "Sélectionner une catégorie",
        vendor_status: "Statut",
        vendor_status_placeholder: "Sélectionner un statut",
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
      risk_status: "Statut du risque",
      risks_by_department: "Risques par département",
      risks_by_assignee: "Risques par assigné",
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
          description: "Suivez et évaluez les risques, créez et assignez des tâches d'atténuation pour votre équipe, et gérez votre registre des risques dans une interface simple."
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
      org_name_description: "C'est le nom visible de votre organisation. Vous devez utiliser le nom légal de votre organisation.",
      org_name_tip: "Veuillez utiliser un maximum de 32 caractères.",
      org_website: "Site Web de l'organisation",
      org_website_description: "C'est l'URL du site Web officiel de votre organisation. Assurez-vous d'inclure l'URL complète avec https://.",
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
    },
    api_keys: {
      title: "API",
      description: "Gérez les clés API pour un accès programmatique aux données de votre organisation.",
      list_title: "Clés API",
      list_description: "Les clés API permettent un accès sécurisé aux données de votre organisation via notre API.",
      create: "Nouvelle clé API",
      create_title: "Nouvelle clé API",
      create_description: "Créez une nouvelle clé API pour un accès programmatique aux données de votre organisation.",
      created_title: "Clé API créée",
      created_description: "Votre clé API a été créée. Assurez-vous de la copier maintenant car vous ne pourrez plus la voir.",
      name: "Nom",
      name_label: "Nom",
      name_placeholder: "Entrez un nom pour cette clé API",
      expiration: "Expiration",
      expiration_placeholder: "Sélectionner l'expiration",
      expires_label: "Expire",
      expires_placeholder: "Sélectionner l'expiration",
      expires_30days: "30 jours",
      expires_90days: "90 jours",
      expires_1year: "1 an",
      expires_never: "Jamais",
      thirty_days: "30 jours",
      ninety_days: "90 jours",
      one_year: "1 an",
      your_key: "Votre clé API",
      api_key: "Clé API",
      save_warning: "Cette clé ne sera affichée qu'une seule fois. Assurez-vous de la copier maintenant.",
      copied: "Clé API copiée dans le presse-papiers",
      close_confirm: "Êtes-vous sûr de vouloir fermer ? Vous ne pourrez plus voir cette clé API.",
      revoke_confirm: "Êtes-vous sûr de vouloir révoquer cette clé API ? Cette action ne peut pas être annulée.",
      revoke_title: "Révoquer la clé API",
      revoke: "Révoquer",
      created: "Créée",
      expires: "Expire",
      last_used: "Dernière utilisation",
      actions: "Actions",
      never: "Jamais",
      never_used: "Jamais utilisée",
      no_keys: "Aucune clé API trouvée. Créez-en une pour commencer.",
      security_note: "Les clés API fournissent un accès complet aux données de votre organisation. Gardez-les sécurisées et renouvelez-les régulièrement.",
      fetch_error: "Échec de la récupération des clés API",
      create_error: "Échec de la création de la clé API",
      revoked_success: "Clé API révoquée avec succès",
      revoked_error: "Échec de la révocation de la clé API",
      done: "Terminé"
    },
    team: {
      tabs: {
        members: "Membres de l'équipe",
        invite: "Inviter des membres"
      },
      members: {
        title: "Membres de l'équipe",
        empty: {
          no_organization: {
            title: "Aucune organisation",
            description: "Vous ne faites partie d'aucune organisation"
          },
          no_members: {
            title: "Aucun membre",
            description: "Il n'y a aucun membre actif dans votre organisation"
          }
        },
        role: {
          owner: "Propriétaire",
          admin: "Administrateur",
          member: "Membre",
          viewer: "Spectateur"
        },
        description: "Gérez les membres de votre équipe et leurs rôles",
        status: {
          accepted: "Accepté",
          pending: "En attente"
        }
      },
      invitations: {
        title: "Invitations en attente",
        description: "Utilisateurs qui ont été invités mais n'ont pas encore accepté",
        empty: {
          no_organization: {
            title: "Aucune organisation",
            description: "Vous ne faites partie d'aucune organisation"
          },
          no_invitations: {
            title: "Aucune invitation en attente",
            description: "Il n'y a aucune invitation en attente"
          }
        },
        invitation_sent: "Invitation envoyée",
        actions: {
          resend: "Renvoyer l'invitation",
          sending: "Envoi de l'invitation",
          revoke: "Révoquer",
          revoke_title: "Révoquer l'invitation",
          revoke_description_prefix: "Êtes-vous sûr de vouloir révoquer l'invitation pour",
          revoke_description_suffix: "Cette action ne peut pas être annulée."
        },
        toast: {
          resend_success_prefix: "Un e-mail d'invitation a été envoyé à",
          resend_error: "Échec de l'envoi de l'invitation",
          resend_unexpected: "Une erreur inattendue s'est produite lors de l'envoi de l'invitation",
          revoke_success_prefix: "Invitation à",
          revoke_success_suffix: "a été révoquée",
          revoke_error: "Échec de la révocation de l'invitation",
          revoke_unexpected: "Une erreur inattendue s'est produite lors de la révocation de l'invitation"
        }
      },
      invite: {
        title: "Inviter un membre de l'équipe",
        description: "Envoyer une invitation à un nouveau membre de l'équipe pour rejoindre votre organisation",
        form: {
          email: {
            label: "E-mail",
            placeholder: "membre@example.com",
            error: "Veuillez entrer une adresse e-mail valide"
          },
          role: {
            label: "Rôle",
            placeholder: "Sélectionner un rôle",
            error: "Veuillez sélectionner un rôle"
          },
          department: {
            label: "Département",
            placeholder: "Sélectionner un département",
            error: "Veuillez sélectionner un département"
          },
          departments: {
            none: "Aucun",
            it: "Informatique",
            hr: "Ressources humaines",
            admin: "Administrateur",
            gov: "Gouvernement",
            itsm: "ITSM",
            qms: "QMS"
          }
        },
        button: {
          send: "Envoyer l'invitation",
          sending: "Envoi de l'invitation...",
          sent: "Invitation envoyée"
        },
        toast: {
          error: "Échec de l'envoi de l'invitation",
          unexpected: "Une erreur inattendue s'est produite lors de l'envoi de l'invitation"
        },
        error: {
          title: "Erreur d'invitation",
          description: "Il y a eu un problème avec votre invitation :",
          "default": "Une erreur inconnue est survenue avec votre invitation.",
          home: "Aller à l'accueil",
          signin: "Se connecter"
        }
      },
      member_actions: {
        actions: "Actions",
        change_role: "Changer de rôle",
        remove_member: "Supprimer un membre",
        remove_confirm: {
          title: "Supprimer un membre de l'équipe",
          description_prefix: "Êtes-vous sûr de vouloir supprimer",
          description_suffix: "Cette action ne peut pas être annulée."
        },
        role_dialog: {
          title: "Changer de rôle",
          description_prefix: "Mettre à jour le rôle de",
          role_label: "Rôle",
          role_placeholder: "Sélectionner un rôle",
          role_descriptions: {
            admin: "Les administrateurs peuvent gérer les membres de l'équipe et les paramètres.",
            member: "Les membres peuvent utiliser toutes les fonctionnalités mais ne peuvent pas gérer les membres de l'équipe.",
            viewer: "Les spectateurs ne peuvent que visualiser le contenu sans apporter de modifications."
          },
          cancel: "Annuler",
          update: "Mettre à jour le rôle"
        },
        toast: {
          remove_success: "a été retiré de l'organisation",
          remove_error: "Échec de la suppression du membre",
          remove_unexpected: "Une erreur inattendue s'est produite lors de la suppression du membre",
          update_role_success: "a eu son rôle mis à jour en",
          update_role_error: "Échec de la mise à jour du rôle du membre",
          update_role_unexpected: "Une erreur inattendue s'est produite lors de la mise à jour du rôle du membre"
        }
      }
    }
  },
  user_menu: {
    theme: "Thème",
    language: "Langue",
    sign_out: "Se déconnecter",
    account: "Compte",
    support: "Assistance",
    settings: "Paramètres",
    teams: "Équipes"
  },
  frameworks: {
    title: "Cadres",
    controls: {
      title: "Contrôles",
      description: "Examiner et gérer les contrôles de conformité",
      table: {
        status: "Statut",
        control: "Contrôle",
        artifacts: "Artifacts",
        actions: "Actions"
      },
      statuses: {
        not_started: "Non commencé",
        completed: "Terminé",
        in_progress: "En cours"
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
          title: "Pas encore de cadres",
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
      vendor_status: "Statut du fournisseur",
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
      hr: "Ressources humaines",
      other: "Autre"
    },
    vendors: "fournisseurs",
    form: {
      vendor_details: "Détails du fournisseur",
      vendor_name: "Nom",
      vendor_name_placeholder: "Entrez le nom du fournisseur",
      vendor_website: "Site web",
      vendor_website_placeholder: "Entrez le site web du fournisseur",
      vendor_description: "Description",
      vendor_description_placeholder: "Entrez la description du fournisseur",
      vendor_category: "Catégorie",
      vendor_category_placeholder: "Sélectionner une catégorie",
      vendor_status: "Statut",
      vendor_status_placeholder: "Sélectionner un statut",
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
        title: "Pas encore de fournisseurs",
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
      taskProgress: "Progression de la tâche",
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
      externalId: "ID externe",
      status: "Statut"
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
    unexpected: "Quelque chose s'est mal passé, veuillez réessayer",
    unauthorized: {
      title: "Accès non autorisé",
      description: "Vous n'avez pas la permission d'accéder à cette ressource. Veuillez contacter votre administrateur si vous pensez qu'il s'agit d'une erreur.",
      back: "Retour à l'accueil"
    }
  },
  sub_pages: {
    risk: {
      overview: "Gestion des risques",
      register: "Registre des risques",
      risk_overview: "Aperçu des risques",
      risk_comments: "Commentaires sur les risques",
      tasks: {
        task_overview: "Aperçu des tâches"
      }
    },
    policies: {
      all: "Toutes les politiques",
      editor: "Éditeur de politique",
      policy_details: "Détails de la politique"
    },
    people: {
      all: "Personnes",
      employee_details: "Détails de l'employé"
    },
    settings: {
      members: "Membres de l'équipe"
    },
    frameworks: {
      overview: "Cadres"
    },
    evidence: {
      title: "Preuve",
      list: "Liste des preuves",
      overview: "Aperçu des preuves"
    },
    tests: {
      overview: "Tests en nuage",
      test_details: "Détails du test"
    },
    vendors: {
      overview: "Fournisseurs",
      register: "Registre des Fournisseurs"
    }
  },
  editor: {
    ai: {
      thinking: "L'IA réfléchit",
      thinking_spinner: "L'IA réfléchit",
      edit_or_generate: "Modifier ou générer...",
      tell_ai_what_to_do_next: "Dites à l'IA quoi faire ensuite",
      request_limit_reached: "Vous avez atteint votre limite de demandes pour la journée."
    },
    ai_selector: {
      improve: "Améliorer l'écriture",
      fix: "Corriger la grammaire",
      shorter: "Raccourcir",
      longer: "Allonger",
      "continue": "Continuer l'écriture",
      replace: "Remplacer la sélection",
      insert: "Insérer ci-dessous",
      discard: "Jeter"
    }
  },
  evidence: {
    title: "Preuve",
    list: "Toutes les preuves",
    overview: "Aperçu des preuves",
    edit: "Modifier la preuve",
    dashboard: {
      layout: "Tableau de bord",
      layout_back_button: "Retour",
      title: "Tableau de bord des preuves",
      by_department: "Par département",
      by_assignee: "Par responsable",
      by_framework: "Par cadre"
    },
    items: "articles",
    status: {
      up_to_date: "À jour",
      needs_review: "Nécessite une révision",
      draft: "Brouillon",
      empty: "Vide"
    },
    departments: {
      none: "Non classé",
      admin: "Administration",
      gov: "Gouvernance",
      hr: "Ressources humaines",
      it: "Technologies de l'information",
      itsm: "Gestion des services informatiques",
      qms: "Gestion de la qualité"
    },
    details: {
      review_section: "Informations de révision",
      content: "Contenu de la preuve"
    }
  },
  upload: {
    fileSection: {
      filesUploaded: "{count} fichier(s) téléchargé(s)",
      upload: "{count} fichier(s) téléchargé(s)"
    },
    fileUpload: {
      uploadingText: "Téléchargement en cours...",
      dropFileHere: "Déposez le fichier ici",
      releaseToUpload: "Relâchez pour télécharger",
      addFiles: "Ajouter des fichiers",
      uploadAdditionalEvidence: "Télécharger un fichier",
      dragDropOrClick: "Glissez-déposez ou cliquez pour télécharger",
      dropFileHereAlt: "Déposez le fichier ici",
      dragDropOrClickToSelect: "Glissez-déposez un fichier ici, ou cliquez pour sélectionner",
      maxFileSize: "Taille maximale du fichier : {size} Mo",
      uploadingFile: "Téléchargement du fichier..."
    },
    fileCard: {
      preview: "Aperçu",
      previewNotAvailable: "Aperçu non disponible. Cliquez sur le bouton de téléchargement pour voir le fichier.",
      filePreview: "Aperçu du fichier : {fileName}",
      openFile: "Ouvrir le fichier",
      deleteFile: "Supprimer le fichier",
      deleteFileConfirmTitle: "Supprimer le fichier",
      deleteFileConfirmDescription: "Êtes-vous sûr de vouloir supprimer ce fichier ? Cette action ne peut pas être annulée."
    },
    fileUrl: {
      additionalLinks: "Liens supplémentaires",
      add: "Ajouter",
      linksAdded: "{count} lien{s} ajouté{s}",
      enterUrl: "Entrez l'URL",
      addAnotherLink: "Ajouter un autre lien",
      saveLinks: "Enregistrer les liens",
      urlBadge: "URL",
      copyLink: "Copier le lien",
      openLink: "Ouvrir le lien",
      deleteLink: "Supprimer le lien"
    }
  },
  tests: {
    name: "Tests Cloud",
    title: "Tests Cloud",
    actions: {
      create: "Ajouter un test Cloud",
      clear: "Effacer les filtres",
      refresh: "Rafraîchir",
      refresh_success: "Tests actualisés avec succès",
      refresh_error: "Échec de l'actualisation des tests"
    },
    empty: {
      no_tests: {
        title: "Aucun test cloud pour le moment",
        description: "Commencez par créer votre premier test dans le cloud."
      },
      no_results: {
        title: "Aucun résultat trouvé",
        description: "Aucun test ne correspond à votre recherche",
        description_with_filters: "Essayez d'ajuster vos filtres"
      }
    },
    filters: {
      search: "Rechercher des tests...",
      role: "Filtrer par fournisseur"
    },
    register: {
      title: "Ajouter un test Cloud",
      description: "Configurer un nouveau test de conformité cloud.",
      submit: "Créer un test",
      success: "Test créé avec succès",
      invalid_json: "Configuration JSON invalide fournie",
      title_field: {
        label: "Titre du test",
        placeholder: "Entrez le titre du test"
      },
      description_field: {
        label: "Description",
        placeholder: "Entrez la description du test"
      },
      provider: {
        label: "Fournisseur Cloud",
        placeholder: "Sélectionnez le fournisseur cloud"
      },
      config: {
        label: "Configuration du test",
        placeholder: "Entrez la configuration JSON pour le test"
      },
      auth_config: {
        label: "Configuration d'authentification",
        placeholder: "Entrez la configuration d'authentification JSON"
      }
    },
    table: {
      title: "Titre",
      provider: "Fournisseur",
      severity: "Gravité",
      result: "Résultat",
      createdAt: "Créé le",
      assignedUser: "Utilisateur assigné",
      assignedUserEmpty: "Non assigné",
      no_results: "Aucun résultat trouvé",
      status: "Statut"
    },
    dashboard: {
      overview: "Aperçu",
      all: "Tous les tests",
      tests_by_assignee: "Tests par le responsable",
      passed: "Réussi",
      failed: "Échoué",
      severity_distribution: "Distribution de la gravité des tests"
    },
    severity: {
      low: "Faible",
      medium: "Moyen",
      high: "Élevé",
      critical: "Critique",
      info: "Info"
    }
  },
  vendors: {
    title: "Fournisseurs",
    register: {
      title: "Inscription du fournisseur",
      create_new: "Créer un Fournisseur"
    },
    dashboard: {
      title: "Aperçu"
    },
    create: "Créer un fournisseur",
    form: {
      vendor_details: "Détails du fournisseur",
      vendor_name: "Nom",
      vendor_name_placeholder: "Entrez le nom du fournisseur",
      vendor_website: "Site Web",
      vendor_website_placeholder: "Entrez le site Web du fournisseur",
      vendor_description: "Description",
      vendor_description_placeholder: "Entrez la description du fournisseur",
      vendor_category: "Catégorie",
      vendor_category_placeholder: "Sélectionner une catégorie",
      vendor_status: "Statut",
      vendor_status_placeholder: "Sélectionner un statut",
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
    }
  },
  dashboard: {
    risk_status: "Statut de risque",
    risks_by_department: "Risques par département",
    vendor_status: "Statut des fournisseurs",
    vendors_by_category: "Fournisseurs par catégorie"
  },
  team: {
    tabs: {
      members: "Membres de l'équipe",
      invite: "Inviter des membres"
    },
    members: {
      title: "Membres de l'équipe",
      empty: {
        no_organization: {
          title: "Aucune organisation",
          description: "Vous ne faites partie d'aucune organisation"
        },
        no_members: {
          title: "Aucun membre",
          description: "Il n'y a aucun membre actif dans votre organisation"
        }
      },
      role: {
        owner: "Propriétaire",
        admin: "Administrateur",
        member: "Membre",
        viewer: "Spectateur"
      }
    },
    invitations: {
      title: "Invitations en attente",
      description: "Utilisateurs qui ont été invités mais n'ont pas encore accepté",
      empty: {
        no_organization: {
          title: "Aucune organisation",
          description: "Vous ne faites partie d'aucune organisation"
        },
        no_invitations: {
          title: "Aucune invitation en attente",
          description: "Il n'y a aucune invitation en attente"
        }
      },
      invitation_sent: "Invitation envoyée",
      actions: {
        resend: "Renvoyer l'invitation",
        sending: "Envoi de l'invitation",
        revoke: "Révoquer",
        revoke_title: "Révoquer l'invitation",
        revoke_description_prefix: "Êtes-vous sûr de vouloir révoquer l'invitation pour",
        revoke_description_suffix: "Cette action ne peut pas être annulée."
      },
      toast: {
        resend_success_prefix: "Un e-mail d'invitation a été envoyé à",
        resend_error: "Échec de l'envoi de l'invitation",
        resend_unexpected: "Une erreur inattendue s'est produite lors de l'envoi de l'invitation",
        revoke_success_prefix: "Invitation à",
        revoke_success_suffix: "a été révoquée",
        revoke_error: "Échec de la révocation de l'invitation",
        revoke_unexpected: "Une erreur inattendue s'est produite lors de la révocation de l'invitation"
      }
    },
    invite: {
      title: "Inviter un membre de l'équipe",
      description: "Envoyer une invitation à un nouveau membre de l'équipe pour rejoindre votre organisation",
      form: {
        email: {
          label: "E-mail",
          placeholder: "membre@exemple.com",
          error: "Veuillez entrer une adresse e-mail valide"
        },
        role: {
          label: "Rôle",
          placeholder: "Sélectionner un rôle",
          error: "Veuillez sélectionner un rôle"
        },
        department: {
          label: "Département",
          placeholder: "Sélectionner un département",
          error: "Veuillez sélectionner un département"
        },
        departments: {
          none: "Aucun",
          it: "Informatique",
          hr: "Ressources humaines",
          admin: "Administrateur",
          gov: "Gouvernement",
          itsm: "ITSM",
          qms: "QMS"
        }
      },
      button: {
        send: "Envoyer l'invitation",
        sending: "Envoi de l'invitation...",
        sent: "Invitation envoyée"
      },
      toast: {
        error: "Échec de l'envoi de l'invitation",
        unexpected: "Une erreur inattendue s'est produite lors de l'envoi de l'invitation"
      }
    },
    member_actions: {
      actions: "Actions",
      change_role: "Changer de rôle",
      remove_member: "Supprimer un membre",
      remove_confirm: {
        title: "Supprimer un membre de l'équipe",
        description_prefix: "Êtes-vous sûr de vouloir supprimer",
        description_suffix: "Cette action ne peut pas être annulée."
      },
      role_dialog: {
        title: "Changer de rôle",
        description_prefix: "Mettre à jour le rôle de",
        role_label: "Rôle",
        role_placeholder: "Sélectionner un rôle",
        role_descriptions: {
          admin: "Les administrateurs peuvent gérer les membres de l'équipe et les paramètres.",
          member: "Les membres peuvent utiliser toutes les fonctionnalités mais ne peuvent pas gérer les membres de l'équipe.",
          viewer: "Les spectateurs peuvent uniquement visualiser le contenu sans apporter de modifications."
        },
        cancel: "Annuler",
        update: "Mettre à jour le rôle"
      },
      toast: {
        remove_success: "a été retiré de l'organisation",
        remove_error: "Échec de la suppression du membre",
        remove_unexpected: "Une erreur inattendue s'est produite lors de la suppression du membre",
        update_role_success: "a vu son rôle mis à jour en",
        update_role_error: "Échec de la mise à jour du rôle du membre",
        update_role_unexpected: "Une erreur inattendue s'est produite lors de la mise à jour du rôle du membre"
      }
    }
  }
} as const;
