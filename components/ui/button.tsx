import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] active:shadow-inner",
  {
    variants: {
      variant: {
        default: "bg-brand-green-dark text-white hover:bg-brand-green-darker hover:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-md",
        outline:
          "border border-input bg-background hover:bg-brand-green-dark hover:text-white hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-brand-green-dark/10 hover:text-brand-green-dark",
        link: "text-brand-green-dark underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[44px] h-11 px-5 py-2.5",
        sm: "min-h-[44px] h-10 rounded-md px-4",
        lg: "min-h-[44px] h-12 rounded-md px-8",
        icon: "min-h-[44px] min-w-[44px] h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    // إزالة asChild من props قبل تمريرها إلى DOM
    const { asChild: _, ...domProps } = props as any;
    
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...domProps}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

