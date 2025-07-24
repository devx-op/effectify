import {
  TextFieldLabel as TextFieldLabelPrimitive,
  TextField as TextFieldPrimitive,
} from '@effectify/react-ui/components/primitives/textfield'
import { cn } from '@effectify/react-ui/lib/utils'
import * as Form from '@radix-ui/react-form'
import { Slot } from '@radix-ui/react-slot'
import { createFormHook, createFormHookContexts, useStore } from '@tanstack/react-form'
import * as React from 'react'

const { fieldContext, formContext, useFieldContext: _useFieldContext, useFormContext } = createFormHookContexts()

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
      <Form.Field className={cn('grid gap-2', className)} name={fieldName} {...props} />
    </ItemContext.Provider>
  )
}

const useFieldContext = () => {
  const { id } = React.useContext(ItemContext)
  const { name: contextFieldName, store, ...fieldApi } = _useFieldContext()

  const errors = useStore(store, (state) => state.meta.errors)
  if (!fieldApi) {
    throw new Error('useFieldContext should be used within <FormItem>')
  }

  return {
    id,
    name: contextFieldName,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    errors,
    store,
    ...fieldApi,
  }
}

function Label({ className, ...props }: React.ComponentProps<typeof TextFieldLabelPrimitive>) {
  const { errors } = useFieldContext()

  return (
    <TextFieldLabelPrimitive
      className={cn(errors.length > 0 && 'text-destructive', className)}
      data-error={!!errors.length}
      data-slot="form-label"
      {...props}
    />
  )
}

function Control({ ...props }: React.ComponentProps<typeof Slot>) {
  const { errors, formItemId, formDescriptionId, formMessageId } = useFieldContext()

  return (
    <Slot
      aria-describedby={errors.length ? `${formDescriptionId} ${formMessageId}` : `${formDescriptionId}`}
      aria-invalid={!!errors.length}
      data-slot="form-control"
      id={formItemId}
      {...props}
    />
  )
}

function Description({ className, ...props }: React.ComponentProps<'p'>) {
  const { formDescriptionId } = useFieldContext()

  return (
    <p
      className={cn('text-muted-foreground text-sm', className)}
      data-slot="form-description"
      id={formDescriptionId}
      {...props}
    />
  )
}

function Message({ className, ...props }: React.ComponentProps<'p'>) {
  const { errors, formMessageId } = useFieldContext()
  const body = errors.length ? String(errors.at(0)?.message ?? '') : props.children
  if (!body) {
    return null
  }

  return (
    <p className={cn('text-destructive text-sm', className)} data-slot="form-message" id={formMessageId} {...props}>
      {body}
    </p>
  )
}

function TextField({ className, ...props }: React.ComponentProps<typeof TextFieldPrimitive>) {
  const { errors } = useFieldContext()

  return (
    <TextFieldPrimitive
      aria-invalid={!!errors.length}
      className={cn(className, errors.length > 0 && 'border-destructive focus-visible:ring-destructive')}
      {...props}
    />
  )
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
