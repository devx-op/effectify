import * as Form from '@radix-ui/react-form'
import * as React from 'react'

import {
  TextFieldLabel as TextFieldLabelPrimitive,
  TextField as TextFieldPrimitive,
} from '@effectify/react-ui/components/primitives/textfield'
import { createFormHook, createFormHookContexts, useStore } from '@tanstack/react-form'

import { cn } from '@effectify/react-ui/lib/utils'
import { Slot } from '@radix-ui/react-slot'

const { fieldContext, formContext, useFieldContext: _useFieldContext, useFormContext } = createFormHookContexts()

// Custom AppForm component that wraps Form.Root
function AppFormWrapper({ children, ...props }: React.ComponentProps<typeof Form.Root>) {
  return <Form.Root {...props}>{children}</Form.Root>
}

const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    Label,
    Control,
    Description,
    Message,
    Item,
    TextField,
  },
  formComponents: {
    Root: AppFormWrapper,
  },
})

type FormItemContextValue = {
  id: string
}

const ItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue)

function Item({ className, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId()
  const fieldApi = _useFieldContext()
  const fieldName = fieldApi?.name || 'field'

  return (
    <ItemContext.Provider value={{ id }}>
      <Form.Field name={fieldName} className={cn('grid gap-2', className)} {...props} />
    </ItemContext.Provider>
  )
}

const useFieldContext = () => {
  const { id } = React.useContext(ItemContext)
  const { name, store, ...fieldContext } = _useFieldContext()

  const errors = useStore(store, (state) => state.meta.errors)
  if (!fieldContext) {
    throw new Error('useFieldContext should be used within <FormItem>')
  }

  return {
    id,
    name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    errors,
    store,
    ...fieldContext,
  }
}

function Label({ className, ...props }: React.ComponentProps<typeof TextFieldLabelPrimitive>) {
  const { errors } = useFieldContext()

  return (
    <TextFieldLabelPrimitive
      data-slot="form-label"
      data-error={!!errors.length}
      className={cn(errors.length > 0 && 'text-destructive', className)}
      {...props}
    />
  )
}

function Control({ ...props }: React.ComponentProps<typeof Slot>) {
  const { errors, formItemId, formDescriptionId, formMessageId } = useFieldContext()

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={!errors.length ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!errors.length}
      {...props}
    />
  )
}

function Description({ className, ...props }: React.ComponentProps<'p'>) {
  const { formDescriptionId } = useFieldContext()

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function Message({ className, ...props }: React.ComponentProps<'p'>) {
  const { errors, formMessageId } = useFieldContext()
  const body = errors.length ? String(errors.at(0)?.message ?? '') : props.children
  if (!body) return null

  return (
    <p data-slot="form-message" id={formMessageId} className={cn('text-destructive text-sm', className)} {...props}>
      {body}
    </p>
  )
}

function TextField({ className, ...props }: React.ComponentProps<typeof TextFieldPrimitive>) {
  const { errors } = useFieldContext()

  return <TextFieldPrimitive aria-invalid={!!errors.length} className={className} {...props} />
}

function FormRoot({ children, ...props }: React.ComponentProps<typeof Form.Root>) {
  return <Form.Root {...props}>{children}</Form.Root>
}

export {
  useAppForm,
  useFormContext,
  useFieldContext,
  withForm,
  FormRoot,
  Item,
  Label,
  Control,
  Description,
  Message,
  TextField,
}
