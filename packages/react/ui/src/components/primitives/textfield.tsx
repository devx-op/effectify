import * as Form from '@radix-ui/react-form'
import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@effectify/react-ui/lib/utils'

interface TextFieldRootProps extends React.ComponentPropsWithoutRef<typeof Form.Field> {
  className?: string
}

export const TextFieldRoot = React.forwardRef<React.ComponentRef<typeof Form.Field>, TextFieldRootProps>(
  ({ className, ...props }, ref) => <Form.Field ref={ref} className={cn('space-y-1', className)} {...props} />,
)
TextFieldRoot.displayName = 'TextFieldRoot'

export const textfieldLabel = cva('text-sm data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70 font-medium', {
  variants: {
    label: {
      true: 'data-[invalid]:text-destructive',
    },
    error: {
      true: 'text-destructive text-xs',
    },
    description: {
      true: 'font-normal text-muted-foreground',
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
    <Form.Label ref={ref} className={cn(textfieldLabel({ label: true, ...variant }), className)} {...props} />
  ),
)
TextFieldLabel.displayName = 'TextFieldLabel'

interface TextFieldErrorMessageProps extends React.ComponentPropsWithoutRef<typeof Form.Message> {}

export const TextFieldErrorMessage = React.forwardRef<
  React.ComponentRef<typeof Form.Message>,
  TextFieldErrorMessageProps
>(({ className, ...props }, ref) => (
  <Form.Message ref={ref} className={cn(textfieldLabel({ error: true }), className)} {...props} />
))
TextFieldErrorMessage.displayName = 'TextFieldErrorMessage'

interface TextFieldDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TextFieldDescription = React.forwardRef<HTMLDivElement, TextFieldDescriptionProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(textfieldLabel({ description: true, label: false }), className)} {...props} />
  ),
)
TextFieldDescription.displayName = 'TextFieldDescription'

interface TextFieldProps extends React.ComponentPropsWithoutRef<typeof Form.Control> {}

export const TextField = React.forwardRef<React.ComponentRef<typeof Form.Control>, TextFieldProps>(
  ({ className, ...props }, ref) => (
    <Form.Control
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-shadow file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
TextField.displayName = 'TextField'
