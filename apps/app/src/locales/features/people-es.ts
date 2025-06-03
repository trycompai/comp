export const people = {
	title: "Personas",
	all: "Todos los Roles",
	all_employees: "Empleados",
	details: {
		title: "Detalles del Empleado",
		tasks: "Tareas",
	},
	status: {
		active: "Activo",
		inactive: "Inactivo",
	},
	description: "Gestiona a los miembros de tu equipo y sus roles.",
	user_management: {
		title: "Gestión de Usuarios",
	},
	filters: {
		search: "Buscar personas...",
		role: "Filtrar por rol",
		all_roles: "Todos los Roles",
	},
	actions: {
		invite: "Agregar Usuario",
		clear: "Limpiar filtros",
	},
	table: {
		name: "Nombre",
		email: "Correo Electrónico",
		department: "Departamento",
		status: "Estado",
	},
	empty: {
		no_employees: {
			title: "Aún no hay empleados",
			description: "Comienza invitando a tu primer miembro del equipo.",
		},
		no_results: {
			title: "No se encontraron resultados",
			description: "Ningún empleado coincide con tu búsqueda",
			description_with_filters: "Intenta ajustar tus filtros",
		},
	},
	roles: {
		owner: "Propietario",
		admin: "Administrador",
		member: "Miembro",
		auditor: "Auditor",
		employee: "Empleado",
		owner_description:
			"Puede gestionar usuarios, políticas, tareas y configuraciones, y eliminar la organización.",
		admin_description:
			"Puede gestionar usuarios, políticas, tareas y configuraciones.",
		employee_description: "Puede firmar políticas y completar capacitaciones.",
		auditor_description: "Acceso de solo lectura para verificaciones de cumplimiento.",
	},
	member_actions: {
		actions: "Acciones",
		edit_roles: "Editar Roles",
		remove_member: "Eliminar Miembro",
		view_profile: "Ver Perfil",
		remove_confirm: {
			title: "Eliminar Miembro del Equipo",
			description_prefix: "¿Estás seguro de que deseas eliminar a",
			description_suffix: "Esta acción no se puede deshacer.",
		},
		role_dialog: {
			title: "Cambiar Rol",
			title_edit: "Editar Roles del Miembro",
			description_prefix: "Actualizar el rol para",
			role_label: "Rol(es)",
			role_placeholder: "Seleccionar rol(es)",
			owner_note:
				"El rol de Propietario no se puede eliminar pero se pueden agregar roles adicionales.",
			at_least_one_role_note: "Se requiere al menos un rol.",
			last_role_tooltip: "Se requiere al menos un rol",
		},
		toast: {
			remove_success: "ha sido eliminado de la organización",
			remove_error: "Error al eliminar miembro",
			remove_unexpected:
				"Ocurrió un error inesperado al eliminar el miembro",
			update_role_success: "Roles del miembro actualizados exitosamente.",
			update_role_error: "Error al actualizar los roles del miembro",
			update_role_unexpected:
				"Ocurrió un error inesperado al actualizar los roles del miembro",
			cannot_remove_owner: "El rol de Propietario no se puede eliminar.",
			select_at_least_one_role: "Por favor selecciona al menos un rol.",
		},
	},
	invite: {
		title: "Agregar Usuario",
		description: "Agrega un empleado a tu organización.",
		pending: "Invitaciones Pendientes",
		email: {
			label: "Dirección de correo electrónico",
			placeholder: "Ingresa la dirección de correo electrónico",
		},
		role: {
			label: "Rol(es)",
			placeholder: "Seleccionar rol(es)",
		},
		name: {
			label: "Nombre",
			placeholder: "Ingresa el nombre",
		},
		department: {
			label: "Departamento",
			placeholder: "Selecciona un departamento",
			none: "Ninguno",
		},
		csv: {
			label: "Archivo CSV",
			description:
				"Sube un archivo CSV con columnas de correo electrónico y rol. El rol puede ser: admin, employee o auditor.",
			download_template: "Descargar Plantilla",
		},
		submit: "Invitar",
		submitting: "Agregando Empleado...",
		success:
			"Empleado agregado exitosamente, recibirá un correo electrónico para unirse al portal.",
		error: "Error al agregar usuario",
	},
	dashboard: {
		title: "Tareas de Empleados",
		employee_task_completion: "Completación de Tareas de Empleados",
		policies_completed: "Políticas Completadas",
		policies_pending: "Políticas Pendientes",
		trainings_completed: "Capacitaciones Completadas",
		trainings_pending: "Capacitaciones Pendientes",
		policies: "Políticas",
		trainings: "Capacitaciones",
		completed: "Completado",
		not_completed: "No Completado",
		no_data: "No hay datos de empleados disponibles",
		no_tasks_completed: "Aún no se han completado tareas",
		no_tasks_available: "No hay tareas disponibles para completar",
	},
	// Added list translations for EmployeesListClient
	list: {
		searchPlaceholder: "Buscar por nombre o correo electrónico...",
		emptyState: "No se encontraron empleados.",
	},
} as const;