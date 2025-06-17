import { cn } from '@comp/ui/cn';
import { motion } from 'framer-motion';

export const ButtonIcon = ({
  className,
  children,
  loading,
  isLoading,
}: {
  className?: string;
  children: React.ReactNode;
  loading?: React.ReactNode;
  isLoading: boolean;
}) => {
  return (
    <div className={cn('relative', className)}>
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{
          opacity: isLoading ? 0 : 1,
          scale: isLoading ? 0.8 : 1,
        }}
      >
        {children}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: isLoading ? 1 : 0,
          scale: isLoading ? 1 : 0.8,
        }}
        className="absolute top-0 left-0"
      >
        {loading}
      </motion.div>
    </div>
  );
};
