import { env } from "@/env.mjs";
import { HeadlessService, type IMessage } from "@novu/headless";
import { useSession } from "@/utils/auth-client";
import { useCallback, useEffect, useRef, useState } from "react";

interface Notification {
	id: string;
	read: boolean;
	seen: boolean;
	createdAt: string;
	payload: {
		description?: string;
		recordId?: string;
		type?: string;
		from?: string;
		to?: string;
		[key: string]: any; // Allow for other payload fields
	};
}

export function useNotifications() {
	const [isLoading, setLoading] = useState(true);
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [subscriberId, setSubscriberId] = useState<string | undefined>();
	const headlessServiceRef = useRef<HeadlessService | null>(null);
	const { data: session } = useSession();

	const markAllMessagesAsRead = () => {
		const headlessService = headlessServiceRef.current;

		if (headlessService) {
			setNotifications((prevNotifications) =>
				prevNotifications.map((notification) => {
					return {
						...notification,
						read: true,
					};
				}),
			);

			headlessService.markAllMessagesAsRead({
				listener: () => {},
				onError: () => {},
			});
		}
	};

	const markMessageAsRead = (messageId: string) => {
		const headlessService = headlessServiceRef.current;

		if (headlessService) {
			setNotifications((prevNotifications) =>
				prevNotifications.map((notification) => {
					if (notification.id === messageId) {
						return {
							...notification,
							read: true,
						};
					}

					return notification;
				}),
			);

			headlessService.markNotificationsAsRead({
				messageId: [messageId],
				listener: (result) => {},
				onError: (error) => {},
			});
		}
	};

	const fetchNotifications = useCallback(() => {
		const headlessService = headlessServiceRef.current;

		if (headlessService) {
			headlessService.fetchNotifications({
				listener: () => {},
				onSuccess: (response) => {
					setLoading(false);
					setNotifications(
						response.data.map((msg: IMessage) => ({
							id: msg._id,
							read: msg.read,
							seen: msg.seen,
							createdAt: msg.createdAt,
							payload: msg.payload || {}, // Handle case where payload might be empty
						})),
					);
				},
			});
		}
	}, []);

	const markAllMessagesAsSeen = () => {
		const headlessService = headlessServiceRef.current;

		if (headlessService) {
			setNotifications((prevNotifications) =>
				prevNotifications.map((notification) => ({
					...notification,
					seen: true,
				})),
			);
			headlessService.markAllMessagesAsSeen({
				listener: () => {},
				onError: () => {},
			});
		}
	};

	useEffect(() => {
		if (session?.user) {
			setSubscriberId(
				`${session.session.activeOrganizationId}_${session.user.id}`,
			);
		}
	}, [session]);

	useEffect(() => {
		const headlessService = headlessServiceRef.current;

		if (headlessService) {
			headlessService.listenNotificationReceive({
				listener: () => {
					fetchNotifications();
				},
			});
		}
	}, [headlessServiceRef.current]);

	useEffect(() => {
		if (subscriberId && !headlessServiceRef.current) {
			const headlessService = new HeadlessService({
				applicationIdentifier: env.NEXT_PUBLIC_NOVU_IDENTIFIER!,
				subscriberId,
			});

			headlessService.initializeSession({
				listener: () => {},
				onSuccess: () => {
					headlessServiceRef.current = headlessService;
					fetchNotifications();
				},
				onError: (error) => {
					console.error("Failed to initialize Novu session:", error);
				},
			});
		}
	}, [fetchNotifications, subscriberId]);

	return {
		isLoading,
		markAllMessagesAsRead,
		markMessageAsRead,
		markAllMessagesAsSeen,
		hasUnseenNotifications: notifications.some(
			(notification) => !notification.seen,
		),
		notifications,
		subscriberId,
	};
}
