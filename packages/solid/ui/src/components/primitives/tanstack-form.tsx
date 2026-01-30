import { cn } from "@effectify/solid-ui/lib/utils"
import { createFormHook, createFormHookContexts } from "@tanstack/solid-form"
import { type ComponentProps, createContext, createUniqueId, splitProps, useContext } from "solid-js"
import { Dynamic } from "solid-js/web"

// Label component (since it doesn't exist in solid-ui yet)
function Label(props: ComponentProps<"label"> & { for?: string }) {
  const [local, rest] = splitProps(props, ["class", "for"])

  return (
    <label
      class={cn(
        "flex select-none items-center gap-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        local.class,
      )}
      data-slot="label"
      for={local.for}
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

function FormItem(props: ComponentProps<"div">) {
  const [local, rest] = splitProps(props, ["class"])
  const id = createUniqueId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div class={cn("grid gap-2", local.class)} data-slot="form-item" {...rest} />
    </FormItemContext.Provider>
  )
}

const useFieldContext = () => {
  const { id } = useContext(FormItemContext)
  const fieldApi = _useFieldContext()

  if (!fieldApi) {
    throw new Error("useFieldContext should be used within <FormItem>")
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
  const [local, rest] = splitProps(props, ["class", "for"])
  const { formItemId, errors } = useFieldContext()

  return (
    <Label
      class={cn("data-[error=true]:text-destructive", local.class)}
      data-error={!!errors().length}
      data-slot="form-label"
      for={local.for || formItemId}
      {...rest}
    />
  )
}

function FormControl(props: ComponentProps<"div">) {
  const [local, rest] = splitProps(props, ["class", "children"])
  const { errors, formItemId, formDescriptionId, formMessageId } = useFieldContext()

  return (
    <Dynamic
      aria-describedby={errors().length ? `${formDescriptionId} ${formMessageId}` : `${formDescriptionId}`}
      aria-invalid={!!errors().length}
      class={local.class}
      component="div"
      data-slot="form-control"
      id={formItemId}
      {...rest}
    >
      {local.children}
    </Dynamic>
  )
}

function FormDescription(props: ComponentProps<"p">) {
  const [local, rest] = splitProps(props, ["class"])
  const { formDescriptionId } = useFieldContext()

  return (
    <p
      class={cn("text-muted-foreground text-sm", local.class)}
      data-slot="form-description"
      id={formDescriptionId}
      {...rest}
    />
  )
}

function FormMessage(props: ComponentProps<"p">) {
  const [local, rest] = splitProps(props, ["class", "children"])
  const { errors, formMessageId } = useFieldContext()
  const errorList = errors()
  const body = errorList.length ? String(errorList[0]?.message ?? "") : local.children
  if (!body) {
    return null
  }

  return (
    <p class={cn("text-destructive text-sm", local.class)} data-slot="form-message" id={formMessageId} {...rest}>
      {body}
    </p>
  )
}

function Input(props: ComponentProps<"input">) {
  const [local, rest] = splitProps(props, ["class"])

  return (
    <input
      class={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-shadow file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...rest}
    />
  )
}

export {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  useAppForm,
  useFieldContext,
  useFormContext,
  withForm,
}
