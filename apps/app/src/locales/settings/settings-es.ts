export const settings = {
	general: {
		title: "General",
		org_name: "Nombre de la organización",
		org_name_description:
			"Este es el nombre visible de su organización. Debe usar el nombre legal de su organización.",
		org_name_tip: "Por favor use un máximo de 32 caracteres.",
		org_website: "Sitio web de la organización",
		org_website_description:
			"Este es el sitio web oficial de su organización. Incluya https:// en la URL.",
		org_website_tip: "Por favor ingrese una URL válida incluyendo https://",
		org_website_error: "Error al actualizar el sitio web de la organización",
		org_website_updated: "Sitio web de la organización actualizado",
		org_delete: "Eliminar organización",
		org_delete_description:
			"Eliminar permanentemente su organización y todo su contenido de la plataforma Comp AI. Esta acción no es reversible - por favor proceda con precaución.",
		org_delete_alert_title: "¿Está absolutamente seguro?",
		org_delete_alert_description:
			"Esta acción no se puede deshacer. Esto eliminará permanentemente su organización y eliminará sus datos de nuestros servidores.",
		delete_confirm_tip: "Escriba 'eliminar' para confirmar",
		delete_confirm: "eliminar",
		org_delete_error: "Error al eliminar la organización",
		org_delete_success: "Organización eliminada",
		org_name_updated: "Nombre de la organización actualizado",
		org_name_error: "Error al actualizar el nombre de la organización",
	},
	users: {
		title: "Gestión de usuarios",
	},
	team: {
		tabs: {
			members: "Miembros",
			invite: "Invitar",
		},
		members: {
			title: "Miembros del equipo",
			description: "Gestione los miembros de su equipo y sus roles.",
		},
		invite: {
			title: "Invitar miembros",
			description: "Invite a nuevos miembros a unirse a su organización.",
		},
	},
	api_keys: {
		title: "API",
		description:
			"Gestione las claves API para el acceso programático a los datos de su organización.",
		list_title: "Claves API",
		list_description:
			"Las claves API permiten el acceso seguro a los datos de su organización a través de nuestra API.",
		create: "Nueva clave API",
		create_title: "Nueva clave API",
		create_description:
			"Cree una nueva clave API para el acceso programático a los datos de su organización.",
		created_title: "Clave API creada",
		created_description:
			"Su clave API ha sido creada. Asegúrese de copiarla ahora ya que no podrá verla de nuevo.",
		name: "Nombre",
		name_placeholder: "Ingrese un nombre para esta clave API",
		expiration: "Expiración",
		expiration_placeholder: "Seleccione expiración",
		thirty_days: "30 días",
		ninety_days: "90 días",
		one_year: "1 año",
		api_key: "Clave API",
		save_warning:
			"Esta clave solo se mostrará una vez. Asegúrese de copiarla ahora.",
		copied: "Clave API copiada al portapapeles",
		revoke_confirm:
			"¿Está seguro de que desea revocar esta clave API? Esta acción no se puede deshacer.",
		revoke_title: "Revocar clave API",
		revoke: "Revocar",
		created: "Creada",
		expires: "Expira",
		last_used: "Último uso",
		actions: "Acciones",
		never: "Nunca",
		never_used: "Nunca usada",
		no_keys: "No se encontraron claves API. Cree una para comenzar.",
		security_note:
			"Las claves API proporcionan acceso completo a los datos de su organización. Manténgalas seguras y rótalas regularmente.",
		fetch_error: "Error al obtener las claves API",
		create_error: "Error al crear la clave API",
		revoked_success: "Clave API revocada exitosamente",
		revoked_error: "Error al revocar la clave API",
		done: "Hecho",
	},
	billing: {
		title: "Facturación",
	},
	trust_portal: {
		friendly_url: {
			available: "¡Esta URL está disponible!",
			unavailable: "Esta URL ya está en uso.",
			checking: "Verificando disponibilidad...",
		},
	},
} as const;