export const tests = {
	dashboard: {
		overview: "Resumen",
		all: "Todas las Pruebas",
		tests_by_assignee: "Pruebas por Responsable",
		passed: "Aprobadas",
		failed: "Fallidas",
		severity_distribution: "Distribución de Severidad de Pruebas",
	},
	test_details: "Detalles de la Prueba",
	severity: {
		info: "Información",
		low: "Baja",
		medium: "Media",
		high: "Alta",
		critical: "Crítica",
	},
	name: "Pruebas en la Nube",
	title: "Pruebas en la Nube",
	actions: {
		create: "Agregar Prueba en la Nube",
		clear: "Limpiar filtros",
		refresh: "Actualizar",
		refresh_success: "Pruebas actualizadas exitosamente",
		refresh_error: "Error al actualizar las pruebas",
	},
	empty: {
		no_tests: {
			title: "Aún no hay pruebas en la nube",
			description: "Comienza creando tu primera prueba en la nube.",
		},
		no_results: {
			title: "No se encontraron resultados",
			description: "Ninguna prueba coincide con tu búsqueda",
			description_with_filters: "Intenta ajustar tus filtros",
		},
	},
	filters: {
		search: "Buscar pruebas...",
		role: "Filtrar por proveedor",
	},
	register: {
		title: "Agregar Prueba en la Nube",
		description: "Configura una nueva prueba de cumplimiento en la nube.",
		submit: "Crear Prueba",
		success: "Prueba creada exitosamente",

		title_field: {
			label: "Título de la Prueba",
			placeholder: "Ingresa el título de la prueba",
		},
		description_field: {
			label: "Descripción",
			placeholder: "Ingresa la descripción de la prueba",
		},
		provider: {
			label: "Proveedor de Nube",
			placeholder: "Selecciona el proveedor de nube",
		},
		config: {
			label: "Configuración de la Prueba",
			placeholder: "Ingresa la configuración JSON para la prueba",
		},
		auth_config: {
			label: "Configuración de Autenticación",
			placeholder: "Ingresa la configuración JSON de autenticación",
		},
	},
	table: {
		title: "Título",
		provider: "Proveedor",
		status: "Estado",
		severity: "Severidad",
		result: "Resultado",
		createdAt: "Fecha de Creación",
		assignedUser: "Usuario Asignado",
		assignedUserEmpty: "No Asignado",
		no_results: "No se encontraron resultados",
	},
} as const;
