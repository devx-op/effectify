import { cn } from "@effectify/react-ui/lib/utils"
import * as Form from "@radix-ui/react-form"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

interface TextFieldRootProps extends React.ComponentPropsWithoutRef<typeof Form.Field> {
  className?: string
}

export const TextFieldRoot = React.forwardRef<React.ComponentRef<typeof Form.Field>, TextFieldRootProps>(
  ({ className, ...props }, ref) => <Form.Field className={cn("space-y-1", className)} ref={ref} {...props} />,
)
TextFieldRoot.displayName = "TextFieldRoot"

export const textfieldLabel = cva("font-medium text-sm data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70", {
  variants: {
    label: {
      true: "data-[invalid]:text-destructive",
    },
    error: {
      true: "text-destructive text-xs",
    },
    description: {
      true: "font-normal text-muted-foreground",
    },
  },
  defaultVariants: {
    label: true,
  },
})

interface TextFieldLabelProps extends React.ComponentPropsWithoutRef<typeof Form.Label> {
  variant?: VariantProps<typeof textfieldLabel>
}

export const TextFieldLabel = React.forwardRef<React.ComponentRef<typeof Form.Label>, TextFieldLabelProps>(
  ({ className, variant, ...props }, ref) => (
    <Form.Label className={cn(textfieldLabel({ label: true, ...variant }), className)} ref={ref} {...props} />
  ),
)
TextFieldLabel.displayName = "TextFieldLabel"

interface TextFieldErrorMessageProps extends React.ComponentPropsWithoutRef<typeof Form.Message> {}

export const TextFieldErrorMessage = React.forwardRef<
  React.ComponentRef<typeof Form.Message>,
  TextFieldErrorMessageProps
>(({ className, ...props }, ref) => (
  <Form.Message className={cn(textfieldLabel({ error: true }), className)} ref={ref} {...props} />
))
TextFieldErrorMessage.displayName = "TextFieldErrorMessage"

interface TextFieldDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TextFieldDescription = React.forwardRef<HTMLDivElement, TextFieldDescriptionProps>(
  ({ className, ...props }, ref) => (
    <div className={cn(textfieldLabel({ description: true, label: false }), className)} ref={ref} {...props} />
  ),
)
TextFieldDescription.displayName = "TextFieldDescription"

interface TextFieldProps extends React.ComponentPropsWithoutRef<typeof Form.Control> {}

export const TextField = React.forwardRef<React.ComponentRef<typeof Form.Control>, TextFieldProps>(
  ({ className, ...props }, ref) => (
    <Form.Control
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-shadow file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
TextField.displayName = "TextField"
