import { ssr, ssrHydrationKey, escape, createComponent, mergeProps, ssrAttribute, ssrElement, Dynamic } from 'solid-js/web';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { splitProps, For, createMemo, mergeProps as mergeProps$1, createSignal, createEffect, onCleanup } from 'solid-js';
import { cva } from 'class-variance-authority';
import * as Array$1 from 'effect/Array';
import * as Chunk from 'effect/Chunk';
import * as DateTime from 'effect/DateTime';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Queue from 'effect/Queue';
import * as Stream from 'effect/Stream';
import { u as useEffectQuery, M as MessagesService, a as useRuntime, q as queryClient } from './ssr.mjs';
import { DateTime as DateTime$1 } from 'effect';
import '@solid-primitives/refs';
import '@tanstack/router-core';
import 'solid-js/store';
import 'tiny-warning';
import 'tiny-invariant';
import 'effect/Random';
import 'effect/Schedule';
import 'effect/Schema';
import 'effect/SubscriptionRef';
import '@tanstack/solid-query';
import 'effect/ManagedRuntime';
import 'effect/Duration';
import 'effect/Exit';
import 'jsesc';
import 'fs';
import '@tanstack/history';
import 'node:async_hooks';
import 'isbot';
import 'node:stream/web';

function deepClone(obj) {
  if (obj === null || typeof obj !== "object")
    return obj;
  if (obj instanceof Date)
    return new Date(obj.getTime());
  if (Array.isArray(obj))
    return obj.map((item) => deepClone(item));
  if (typeof obj === "object") {
    const cloned = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
}
function createQueryKey(key) {
  return (variables) => variables === void 0 ? [key] : [key, variables];
}
function createQueryDataHelpers(queryKey) {
  const [namespaceKey] = queryKey(void 0);
  return {
    removeQuery: (variables) => {
      queryClient.removeQueries({ queryKey: queryKey(variables) });
    },
    removeAllQueries: () => {
      queryClient.removeQueries({ queryKey: [namespaceKey], exact: false });
    },
    setData: (variables, updater) => {
      return queryClient.setQueryData(queryKey(variables), (oldData) => {
        if (oldData === void 0)
          return oldData;
        const clonedData = deepClone(oldData);
        updater(clonedData);
        return clonedData;
      });
    },
    invalidateQuery: (variables) => queryClient.invalidateQueries({ queryKey: queryKey(variables) }),
    invalidateAllQueries: () => queryClient.invalidateQueries({ queryKey: [namespaceKey], exact: false }),
    refetchQuery: (variables) => queryClient.refetchQueries({ queryKey: queryKey(variables) }),
    refetchAllQueries: () => queryClient.refetchQueries({ queryKey: [namespaceKey], exact: false })
  };
}
const cn = (...classLists) => twMerge(clsx(classLists));
function isString(value) {
  return Object.prototype.toString.call(value) === "[object String]";
}
function mergeDefaultProps(defaultProps, props) {
  return mergeProps$1(defaultProps, props);
}
function setupGlobalEvents() {
  {
    return;
  }
}
if (typeof document !== "undefined") {
  if (document.readyState !== "loading") ; else {
    document.addEventListener("DOMContentLoaded", setupGlobalEvents);
  }
}
function createTagName(ref, fallback) {
  const [tagName, setTagName] = createSignal(stringOrUndefined(fallback == null ? void 0 : fallback()));
  createEffect(() => {
    var _a;
    setTagName(((_a = ref()) == null ? void 0 : _a.tagName.toLowerCase()) || stringOrUndefined(fallback == null ? void 0 : fallback()));
  });
  return tagName;
}
function stringOrUndefined(value) {
  return isString(value) ? value : void 0;
}
function Polymorphic(props) {
  const [local, others] = splitProps(props, ["as"]);
  if (!local.as) {
    throw new Error("[kobalte]: Polymorphic is missing the required `as` prop.");
  }
  return (
    // @ts-ignore: Props are valid but not worth calculating
    createComponent(Dynamic, mergeProps(others, {
      get component() {
        return local.as;
      }
    }))
  );
}
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all) __defProp(target, name, {
    get: all[name],
    enumerable: true
  });
};
var button_exports = {};
__export(button_exports, {
  Button: () => Button$1,
  Root: () => ButtonRoot
});
var BUTTON_INPUT_TYPES = ["button", "color", "file", "image", "reset", "submit"];
function isButton(element) {
  const tagName = element.tagName.toLowerCase();
  if (tagName === "button") {
    return true;
  }
  if (tagName === "input" && element.type) {
    return BUTTON_INPUT_TYPES.indexOf(element.type) !== -1;
  }
  return false;
}
function ButtonRoot(props) {
  let ref;
  const mergedProps = mergeDefaultProps({
    type: "button"
  }, props);
  const [local, others] = splitProps(mergedProps, ["ref", "type", "disabled"]);
  const tagName = createTagName(() => ref, () => "button");
  const isNativeButton = createMemo(() => {
    const elementTagName = tagName();
    if (elementTagName == null) {
      return false;
    }
    return isButton({
      tagName: elementTagName,
      type: local.type
    });
  });
  const isNativeInput = createMemo(() => {
    return tagName() === "input";
  });
  const isNativeLink = createMemo(() => {
    return tagName() === "a" && (void 0 ) != null;
  });
  return createComponent(Polymorphic, mergeProps({
    as: "button",
    get type() {
      return isNativeButton() || isNativeInput() ? local.type : void 0;
    },
    get role() {
      return !isNativeButton() && !isNativeLink() ? "button" : void 0;
    },
    get tabIndex() {
      return !isNativeButton() && !isNativeLink() && !local.disabled ? 0 : void 0;
    },
    get disabled() {
      return isNativeButton() || isNativeInput() ? local.disabled : void 0;
    },
    get ["aria-disabled"]() {
      return !isNativeButton() && !isNativeInput() && local.disabled ? true : void 0;
    },
    get ["data-disabled"]() {
      return local.disabled ? "" : void 0;
    }
  }, others));
}
var Button$1 = ButtonRoot;
const buttonVariants = cva("inline-flex items-center justify-center rounded-md text-sm font-medium transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
      destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
      outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline"
    },
    size: {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-10 rounded-md px-8",
      icon: "h-9 w-9"
    }
  },
  defaultVariants: {
    variant: "default",
    size: "default"
  }
});
const Button = (props) => {
  const [local, rest] = splitProps(props, ["class", "variant", "size"]);
  return createComponent(Button$1, mergeProps({
    get ["class"]() {
      return cn(buttonVariants({
        size: local.size,
        variant: local.variant
      }), local.class);
    }
  }, rest));
};
var _tmpl$$6 = ["<div", ">", "</div>"];
const Center = (props) => {
  return ssr(_tmpl$$6, ssrHydrationKey() + ssrAttribute("class", escape(cn(props.inline ? "inline-flex" : "flex", "items-center justify-center", props.class), true), false), escape(props.children));
};
var _tmpl$$5 = ["<div", ">", "</div>"];
const Flex = (props) => {
  return ssr(_tmpl$$5, ssrHydrationKey() + ssrAttribute("class", escape(cn("flex", props.direction && `flex-${props.direction}`, props.wrap && "flex-wrap", props.align && `items-${props.align}`, props.justify && `justify-${props.justify}`, props.basis && `basis-${props.basis}`, props.grow && (typeof props.grow === "boolean" ? "grow" : `grow-${props.grow}`), props.shrink && (typeof props.shrink === "boolean" ? "shrink" : `shrink-${props.shrink}`), props.gap && `gap-${props.gap}`, props.class), true), false), escape(props.children));
};
var _tmpl$$4 = ["<div", ">", "</div>"];
const Stack = (props) => {
  return ssr(_tmpl$$4, ssrHydrationKey() + ssrAttribute("class", escape(cn("flex", props.direction ? `flex-${props.direction}` : "flex-col", props.align && `items-${props.align}`, props.justify && `justify-${props.justify}`, props.gap && `gap-${props.gap}`, props.class), true), false), escape(props.children));
};
const VStack = (props) => {
  const {
    class: className,
    ...rest
  } = props;
  return createComponent(Stack, mergeProps(rest, {
    direction: "col",
    "class": className
  }));
};
var MessagesOperations;
((MessagesOperations2) => {
  const messagesQueryKey = createQueryKey("MessagesOperations.useMessagesQuery");
  const messagesQueryData = createQueryDataHelpers(messagesQueryKey);
  MessagesOperations2.useMessagesQuery = () => {
    return useEffectQuery({
      queryKey: messagesQueryKey(),
      queryFn: () => MessagesService.use((service) => service.getMessages()),
      staleTime: "6.5 millis"
    });
  };
  MessagesOperations2.useMarkMessagesAsRead = (messages) => {
    const runtime = useRuntime();
    const queue = Effect.runSync(Queue.unbounded());
    createEffect(() => {
      const streamFiber = Stream.fromQueue(queue).pipe(
        Stream.tap((value) => Effect.log(`Queued up ${value}`)),
        Stream.groupedWithin(25, "5 seconds"),
        Stream.tap((batch) => Effect.log(`Batching: ${Chunk.join(batch, ", ")}`)),
        Stream.mapEffect(
          (batch) => MessagesService.sendMarkAsReadBatch(batch),
          {
            concurrency: "unbounded"
          }
        ),
        Stream.catchAllCause(() => Effect.void),
        Stream.runDrain,
        runtime.runFork
      );
      return () => {
        runtime.runFork(Fiber.interrupt(streamFiber));
      };
    }, [queue, runtime]);
    const unreadMessages = createMemo(() => messages.filter((message) => message.readAt === null), [messages]);
    const offer = (id) => {
      queue.unsafeOffer(id);
      messagesQueryData.setData(void 0, (messages2) => {
        const msgIndex = messages2.findIndex((msg) => msg.id === id);
        if (msgIndex !== -1) {
          const existingMessage = messages2[msgIndex];
          if (existingMessage === void 0) return messages2;
          if (existingMessage.readAt !== null) return messages2;
          existingMessage.readAt = DateTime.unsafeNow();
        }
        return messages2;
      });
    };
    createEffect(() => {
      if (queue === null) return () => {
      };
      const handleFocus = () => {
        if (!document.hasFocus()) return;
        unreadMessages().forEach((message) => {
          const element = document.querySelector(`[data-message-id="${message.id}"]`);
          if (element === null) return;
          const rect = element.getBoundingClientRect();
          const isFullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
          if (isFullyVisible) {
            void offer(message.id);
          }
        });
      };
      window.addEventListener("focus", handleFocus);
      onCleanup(() => {
        window.removeEventListener("focus", handleFocus);
      });
      return;
    }, [offer, unreadMessages]);
    let observer = null;
    createEffect(() => {
      observer = new IntersectionObserver(
        // biome-ignore lint/complexity/noForEach: <explanation>
        Array$1.forEach((entry) => {
          if (!entry.isIntersecting || !document.hasFocus()) return;
          const messageId = Option.fromNullable(entry.target.getAttribute("data-message-id")).pipe(
            Option.flatMap(Option.liftPredicate((str) => str !== ""))
          );
          if (Option.isSome(messageId)) {
            void offer(messageId.value);
          }
          observer == null ? void 0 : observer.unobserve(entry.target);
        }),
        { threshold: 1 }
      );
      return () => {
        observer == null ? void 0 : observer.disconnect();
      };
    }, [offer]);
    return { observer };
  };
})(MessagesOperations || (MessagesOperations = {}));
/**
* @license lucide-solid v0.523.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
};
var defaultAttributes_default = defaultAttributes;
var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
var toCamelCase = (string) => string.replace(/^([A-Z])|[\s-_]+(\w)/g, (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase());
var toPascalCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();
var Icon = (props) => {
  const [localProps, rest] = splitProps(props, ["color", "size", "strokeWidth", "children", "class", "name", "iconNode", "absoluteStrokeWidth"]);
  return ssrElement("svg", mergeProps(defaultAttributes_default, {
    get width() {
      var _a;
      return (_a = localProps.size) != null ? _a : defaultAttributes_default.width;
    },
    get height() {
      var _a;
      return (_a = localProps.size) != null ? _a : defaultAttributes_default.height;
    },
    get stroke() {
      var _a;
      return (_a = localProps.color) != null ? _a : defaultAttributes_default.stroke;
    },
    get ["stroke-width"]() {
      var _a, _b;
      return localProps.absoluteStrokeWidth ? Number((_a = localProps.strokeWidth) != null ? _a : defaultAttributes_default["stroke-width"]) * 24 / Number(localProps.size) : Number((_b = localProps.strokeWidth) != null ? _b : defaultAttributes_default["stroke-width"]);
    },
    get ["class"]() {
      return mergeClasses("lucide", "lucide-icon", ...localProps.name != null ? [`lucide-${toKebabCase(toPascalCase(localProps.name))}`, `lucide-${toKebabCase(localProps.name)}`] : [], localProps.class != null ? localProps.class : "");
    }
  }, rest), () => escape(createComponent(For, {
    get each() {
      return localProps.iconNode;
    },
    children: ([elementName, attrs]) => {
      return createComponent(Dynamic, mergeProps({
        component: elementName
      }, attrs));
    }
  })), true);
};
var Icon_default = Icon;
var iconNode$1 = [["path", {
  d: "M18 6 7 17l-5-5",
  key: "116fxf"
}], ["path", {
  d: "m22 10-7.5 7.5L13 16",
  key: "ke71qq"
}]];
var CheckCheck = (props) => createComponent(Icon_default, mergeProps(props, {
  iconNode: iconNode$1,
  name: "check-check"
}));
var check_check_default = CheckCheck;
var iconNode = [["circle", {
  cx: "12",
  cy: "12",
  r: "10",
  key: "1mglay"
}], ["line", {
  x1: "12",
  x2: "12",
  y1: "8",
  y2: "12",
  key: "1pkeuh"
}], ["line", {
  x1: "12",
  x2: "12.01",
  y1: "16",
  y2: "16",
  key: "4dfq90"
}]];
var CircleAlert = (props) => createComponent(Icon_default, mergeProps(props, {
  iconNode,
  name: "circle-alert"
}));
var circle_alert_default = CircleAlert;
var _tmpl$$3 = ["<div", ' class="bg-muted-foreground/20 h-4 rounded" style="', '"></div>'], _tmpl$2$1 = ["<div", ' class="bg-muted-foreground/20 h-3 w-12 rounded"></div>'], _tmpl$3$1 = ["<div", ' class="bg-muted-foreground/20 h-4 w-4 rounded"></div>'], _tmpl$4 = ["<div", ' class="bg-muted animate-pulse rounded-2xl px-4 py-2">', "</div>"];
const MessageBubbleSkeleton = ({
  width = 200
}) => {
  return createComponent(VStack, {
    get children() {
      return createComponent(Flex, {
        align: "end",
        gap: "2",
        "class": "flex items-end gap-2",
        get children() {
          return ssr(_tmpl$4, ssrHydrationKey(), escape(createComponent(VStack, {
            gap: "1",
            get children() {
              return [ssr(_tmpl$$3, ssrHydrationKey(), `width:${escape(width, true)}px`), createComponent(Flex, {
                align: "center",
                justify: "end",
                gap: "1",
                "class": "mt-1",
                get children() {
                  return [ssr(_tmpl$2$1, ssrHydrationKey()), ssr(_tmpl$3$1, ssrHydrationKey())];
                }
              })];
            }
          })));
        }
      });
    }
  });
};
const MessageListSkeleton = () => {
  const widths = [180, 260, 200, 180, 260, 200, 180, 260, 200];
  return createComponent(VStack, {
    gap: "4",
    "class": "p-4",
    get children() {
      return widths.map((width) => createComponent(MessageBubbleSkeleton, {
        width
      }));
    }
  });
};
var _tmpl$$2 = ['<div class="rounded-2xl bg-muted px-4 py-2 text-foreground"><p class="text-sm">', '</p><div class="mt-1 flex items-center justify-end gap-1"><span class="text-xs text-muted-foreground">', "</span><!--$-->", "<!--/--></div></div>"];
const MessageBubble = (props) => {
  return ssrElement("div", mergeProps(props, {
    "class": "flex items-end gap-2"
  }), () => ssr(_tmpl$$2, escape(props.message.body), escape(props.message.createdAt.pipe(DateTime$1.formatLocal({
    hour: "2-digit",
    minute: "2-digit"
  }))), escape(createComponent(check_check_default, {
    get ["class"]() {
      return cn("size-4", props.message.readAt ? "text-blue-500" : "text-muted-foreground");
    }
  }))), true);
};
const MessageList = ({
  messages
}) => {
  const {
    observer
  } = MessagesOperations.useMarkMessagesAsRead(messages);
  return createComponent(VStack, {
    gap: "4",
    "class": "p-4",
    get children() {
      return messages.map((message) => createComponent(MessageBubble, {
        message,
        get ["data-message-id"]() {
          return message.id;
        }
      }));
    }
  });
};
var _tmpl$$1 = ["<p", ' class="font-semibold text-destructive">Error loading messages</p>'], _tmpl$2 = ["<p", ' class="text-sm text-muted-foreground">Something went wrong. Please try again.</p>'], _tmpl$3 = ["<div", ' class="border-b p-4"><h2 class="text-lg font-semibold">Messages</h2></div>'];
const ErrorState = ({
  messagesQuery
}) => {
  return createComponent(VStack, {
    align: "center",
    justify: "center",
    gap: "4",
    "class": "p-4",
    get children() {
      return [createComponent(circle_alert_default, {
        "class": "size-12 text-destructive"
      }), createComponent(Center, {
        get children() {
          return [ssr(_tmpl$$1, ssrHydrationKey()), ssr(_tmpl$2, ssrHydrationKey())];
        }
      }), createComponent(Button, {
        variant: "outline",
        onClick: () => messagesQuery.refetch(),
        get children() {
          return [createComponent(circle_alert_default, {
            "class": "size-4"
          }), "Retry"];
        }
      })];
    }
  });
};
const ChatContainer = () => {
  const messagesQuery = MessagesOperations.useMessagesQuery();
  return createComponent(VStack, {
    "class": "rounded-lg border bg-card h-[calc(100vh-4rem)]",
    get children() {
      return [ssr(_tmpl$3, ssrHydrationKey()), createComponent(Flex, {
        "class": "flex-1 overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-rounded-lg scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent",
        get children() {
          return messagesQuery.isLoading ? createComponent(MessageListSkeleton, {}) : !messagesQuery.isSuccess ? createComponent(ErrorState, {
            messagesQuery
          }) : createComponent(MessageList, {
            get messages() {
              return messagesQuery.data;
            }
          });
        }
      })];
    }
  });
};
var _tmpl$ = ["<div", ' class="p-16">', "</div>"];
const SplitComponent = function IndexComponent() {
  return ssr(_tmpl$, ssrHydrationKey(), escape(createComponent(ChatContainer, {})));
};

export { SplitComponent as component };
//# sourceMappingURL=index-BFk97H71.mjs.map
