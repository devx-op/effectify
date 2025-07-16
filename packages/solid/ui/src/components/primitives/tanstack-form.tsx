import { type ComponentProps, createContext, createUniqueId, splitProps, useContext } from 'solid-js'
import { Dynamic } from 'solid-js/web'

import { cn } from '@effectify/solid-ui/lib/utils'
import { createFormHook, createFormHookContexts } from '@tanstack/solid-form'

// Label component (since it doesn't exist in solid-ui yet)
function Label(props: ComponentProps<'label'> & { for?: string }) {
  const [local, rest] = splitProps(props, ['class', 'for'])

  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: This is a generic label component that will be properly associated when used
    <label
      data-slot="label"
      for={local.for}
      class={cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        local.class,
      )}
      {...rest}
    />
  )
}

const { fieldContext, formContext, useFieldContext: _useFieldContext, useFormContext } = createFormHookContexts()

const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
    FormItem,
  },
  formComponents: {},
})

type FormItemContextValue = {
  id: string
}

const FormItemContext = createContext<FormItemContextValue>({} as FormItemContextValue)

function FormItem(props: ComponentProps<'div'>) {
  const [local, rest] = splitProps(props, ['class'])
  const id = createUniqueId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" class={cn('grid gap-2', local.class)} {...rest} />
    </FormItemContext.Provider>
  )
}

const useFieldContext = () => {
  const { id } = useContext(FormItemContext)
  const fieldApi = _useFieldContext()

  if (!fieldApi) {
    throw new Error('useFieldContext should be used within <FormItem>')
  }

  const errors = () => fieldApi().state.meta.errors

  return {
    id,
    name: fieldApi().name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    errors,
    fieldApi,
  }
}

function FormLabel(props: ComponentProps<typeof Label>) {
  const [local, rest] = splitProps(props, ['class', 'for'])
  const { formItemId, errors } = useFieldContext()

  return (
    <Label
      data-slot="form-label"
      data-error={!!errors().length}
      class={cn('data-[error=true]:text-destructive', local.class)}
      for={local.for || formItemId}
      {...rest}
    />
  )
}

function FormControl(props: ComponentProps<'div'>) {
  const [local, rest] = splitProps(props, ['class', 'children'])
  const { errors, formItemId, formDescriptionId, formMessageId } = useFieldContext()

  return (
    <Dynamic
      component="div"
      data-slot="form-control"
      id={formItemId}
      aria-describedby={!errors().length ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!errors().length}
      class={local.class}
      {...rest}
    >
      {local.children}
    </Dynamic>
  )
}

function FormDescription(props: ComponentProps<'p'>) {
  const [local, rest] = splitProps(props, ['class'])
  const { formDescriptionId } = useFieldContext()

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      class={cn('text-muted-foreground text-sm', local.class)}
      {...rest}
    />
  )
}

function FormMessage(props: ComponentProps<'p'>) {
  const [local, rest] = splitProps(props, ['class', 'children'])
  const { errors, formMessageId } = useFieldContext()
  const errorList = errors()
  const body = errorList.length ? String(errorList[0]?.message ?? '') : local.children
  if (!body) return null

  return (
    <p data-slot="form-message" id={formMessageId} class={cn('text-destructive text-sm', local.class)} {...rest}>
      {body}
    </p>
  )
}

export {
  useAppForm,
  useFormContext,
  useFieldContext,
  withForm,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Label,
}
