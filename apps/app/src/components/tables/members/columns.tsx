"use client";

import { changeUserRoleAction } from "@/actions/organization/team/change-user-role-action";
import { removeMemberAction } from "@/actions/organization/team/remove-member-action";
import { useI18n } from "@/locales/client";
import type { Role } from "@bubba/db";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@bubba/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImageNext } from "@bubba/ui/avatar";
import { Button } from "@bubba/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@bubba/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bubba/ui/select";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, MoreHorizontal, Trash2Icon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

export type MemberType = {
  user: {
    id: string;
    name: string;
    image: string;
    email: string;
    organizationId: string;
  };
  role: Role;
};

export function columns(): ColumnDef<MemberType>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <div className="flex items-center space-x-4">
            <Avatar className="rounded-full w-8 h-8">
              <AvatarImageNext
                src={row.original.user?.image}
                alt={row.original.user?.name}
                width={32}
                height={32}
              />
              <AvatarFallback>
                <span className="text-xs">
                  {row.original.user.name?.charAt(0)?.toUpperCase()}
                </span>
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-sm">
                {row.original.user.name}
              </span>
              <span className="text-sm text-muted">
                {row.original.user.email}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row, table }) => {
        const t = useI18n();

        const changeUserRole = useAction(changeUserRoleAction, {
          onSuccess: () => {
            toast.success(t("roles.success_changing_user_role"));
          },
          onError: () => {
            toast.error(t("roles.error_changing_user_role"));
          },
        });

        const removeMember = useAction(removeMemberAction, {
          onSuccess: () => {
            toast.success(t("settings.members.remove_member_success"));
          },
          onError: () => {
            toast.error(t("settings.members.remove_member_error"));
          },
        });

        return (
          <div className="flex justify-end">
            <div className="flex space-x-2 items-center">
              <Select
                value={row.original.role}
                onValueChange={(role) => {
                  changeUserRole.execute({
                    userId: row.original.user.id,
                    organizationId: row.original.user.organizationId,
                    role: role as Role,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t(`roles.${row.original.role}`)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                  <SelectItem value="member">{t("roles.member")}</SelectItem>
                  <SelectItem value="auditor">{t("roles.auditor")}</SelectItem>
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <AlertDialog>
                    <DropdownMenuItem
                      className="text-destructive"
                      asDialogTrigger
                    >
                      <AlertDialogTrigger>
                        {t("settings.members.remove_member")}
                      </AlertDialogTrigger>
                    </DropdownMenuItem>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t("settings.members.remove_member")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("settings.members.remove_member_description")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          {t("settings.members.cancel_button")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          disabled={removeMember.status === "executing"}
                          onClick={() =>
                            removeMember.execute({
                              userId: row.original.user.id,
                              organizationId: row.original.user.organizationId,
                            })
                          }
                        >
                          {removeMember.status === "executing" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            t("settings.members.confirm_button")
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      },
    },
  ];
}
