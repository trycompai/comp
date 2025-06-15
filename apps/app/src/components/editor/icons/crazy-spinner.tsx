const CrazySpinner = () => {
  return (
    <div className="flex items-center justify-center gap-0.5">
      <div className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
      <div className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
      <div className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full" />
    </div>
  );
};

export default CrazySpinner;
