import { Spinner } from "@comp/ui/spinner";

export default function TasksLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner size={20} />
    </div>
  );
}
