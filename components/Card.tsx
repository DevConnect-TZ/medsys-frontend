import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white rounded-lg shadow-md border border-gray-200 p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children }: CardProps) {
  return <div className="mb-4 pb-4 border-b border-gray-200">{children}</div>;
}

export function CardTitle({ className, children, ...props }: CardProps) {
  return (
    <h2
      className={clsx('text-xl font-semibold text-gray-900', className)}
      {...props}
    >
      {children}
    </h2>
  );
}

export function CardContent({ children }: CardProps) {
  return <div>{children}</div>;
}

export function CardFooter({ children }: CardProps) {
  return (
    <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-2">
      {children}
    </div>
  );
}
