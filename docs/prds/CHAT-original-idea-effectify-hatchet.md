¡Totalmente viable y de hecho es una excelente idea! Integrar un SDK basado en Promesas como el de Hatchet dentro del ecosistema de Effect es uno de los casos de uso más comunes e ideales. Te permite ganar tipado estricto de errores, inyección de dependencias limpia y un manejo de concurrencia mucho más robusto.
​Aquí tienes un Proof of Concept (PoC) de cómo se vería @effectify/hatchet. Lo dividiremos en tres partes: la definición del servicio (para inyección de dependencias), los wrappers de las acciones asíncronas, y el adaptador para que Hatchet pueda ejecutar tus steps definidos con Effect.
​1. Definición del Servicio y Errores
​Primero, envolvemos la instancia de Hatchet en un Context.Tag para poder inyectarla en nuestra aplicación, y definimos un tipo de error personalizado.

import { Effect, Context, Layer, Data } from "effect";
import { Hatchet } from "@hatchet-dev/typescript-sdk";

// Definimos un error tipado para nuestro wrapper
export class HatchetError extends Data.TaggedError("HatchetError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// Creamos el Tag para inyectar el cliente de Hatchet
export class HatchetClient extends Context.Tag("@effectify/hatchet/Client")<
  HatchetClient,
  Hatchet

> () {}

// Capa (Layer) para proveer el cliente en tu aplicación
export const HatchetLive = Layer.succeed(
  HatchetClient,
  Hatchet.init() // Inicialización real del SDK de Hatchet
);

2. Wrapper de Acciones (Llamadas a la API)
   ​Aquí envolvemos las llamadas a la API de Hatchet (que devuelven Promesas) usando Effect.tryPromise. Esto convierte las excepciones no controladas de las Promesas en errores tipados (HatchetError) en el canal de errores de Effect.

// Wrapper para ejecutar un workflow desde tu app Effect
export const runWorkflow = (workflowName: string, input: any) =>
  Effect.gen(function* () {
    // Obtenemos el cliente inyectado
    const hatchet = yield* HatchetClient;

    // Envolvemos la Promesa en un Effect
    return yield* Effect.tryPromise({
      try: () => hatchet.admin.runWorkflow(workflowName, input),
      catch: (error) => new HatchetError({
        message: `Error al ejecutar workflow ${workflowName}`,
        cause: error
      }),
    });
  });

3. Adaptador para Workflows (El "Effectifier")
   ​Hatchet espera que los steps de un workflow sean funciones asíncronas (Promise). Para que tu app sea "nativa en Effect", quieres escribir tus steps devolviendo Effect. Necesitamos una función que traduzca tu Effect de vuelta a una Promise que Hatchet pueda entender al registrar el worker.

import { Context as HatchetContext } from "@hatchet-dev/typescript-sdk";

/**
 * Convierte un step escrito en Effect en una función async compatible con Hatchet.
 * Nota: Para este PoC asumimos que el Effect no tiene requerimientos (never).
*/
export const effectifyStep = <A, E>(
  effectStep: (ctx: HatchetContext<any, any>) => Effect.Effect<A, E, never>
) => {
  return async (ctx: HatchetContext<any, any>): Promise<A> => {
    // Convertimos el Effect en una Promesa para que Hatchet lo ejecute
    return await Effect.runPromise(effectStep(ctx));
  };
};[10:06 PM]¡Totalmente viable y de hecho es una excelente idea! Integrar un SDK basado en Promesas como el de Hatchet dentro del ecosistema de Effect es uno de los casos de uso más comunes e ideales. Te permite ganar tipado estricto de errores, inyección de dependencias limpia y un manejo de concurrencia mucho más robusto.
Aquí tienes un Proof of Concept (PoC) de cómo se vería @effectify/hatchet. Lo dividiremos en tres partes: la definición del servicio (para inyección de dependencias), los wrappers de las acciones asíncronas, y el adaptador para que Hatchet pueda ejecutar tus steps definidos con Effect.

1. Definición del Servicio y Errores
   Primero, envolvemos la instancia de Hatchet en un Context.Tag para poder inyectarla en nuestra aplicación, y definimos un tipo de error personalizado.
   import { Effect, Context, Layer, Data } from "effect";
   import { Hatchet } from "@hatchet-dev/typescript-sdk";

// Definimos un error tipado para nuestro wrapper
export class HatchetError extends Data.TaggedError("HatchetError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// Creamos el Tag para inyectar el cliente de Hatchet
export class HatchetClient extends Context.Tag("@effectify/hatchet/Client")<
  HatchetClient,
  Hatchet

> () {}

// Capa (Layer) para proveer el cliente en tu aplicación
export const HatchetLive = Layer.succeed(
  HatchetClient,
  Hatchet.init() // Inicialización real del SDK de Hatchet
);

2. Wrapper de Acciones (Llamadas a la API)
   Aquí envolvemos las llamadas a la API de Hatchet (que devuelven Promesas) usando Effect.tryPromise. Esto convierte las excepciones no controladas de las Promesas en errores tipados (HatchetError) en el canal de errores de Effect.
   // Wrapper para ejecutar un workflow desde tu app Effect
   export const runWorkflow = (workflowName: string, input: any) =>
     Effect.gen(function* () {
       // Obtenemos el cliente inyectado
       const hatchet = yield* HatchetClient;

    // Envolvemos la Promesa en un Effect
    return yield* Effect.tryPromise({
      try: () => hatchet.admin.runWorkflow(workflowName, input),
      catch: (error) => new HatchetError({
        message: `Error al ejecutar workflow ${workflowName}`,
        cause: error
      }),
    });
  });

3. Adaptador para Workflows (El "Effectifier")
   Hatchet espera que los steps de un workflow sean funciones asíncronas (Promise). Para que tu app sea "nativa en Effect", quieres escribir tus steps devolviendo Effect. Necesitamos una función que traduzca tu Effect de vuelta a una Promise que Hatchet pueda entender al registrar el worker.
   import { Context as HatchetContext } from "@hatchet-dev/typescript-sdk";

/**
 * Convierte un step escrito en Effect en una función async compatible con Hatchet.
 * Nota: Para este PoC asumimos que el Effect no tiene requerimientos (never).
*/
export const effectifyStep = <A, E>(
  effectStep: (ctx: HatchetContext<any, any>) => Effect.Effect<A, E, never>
) => {
  return async (ctx: HatchetContext<any, any>): Promise<A> => {
    // Convertimos el Effect en una Promesa para que Hatchet lo ejecute
    return await Effect.runPromise(effectStep(ctx));
  };
};

4. Ejemplo de Uso: Tu App Nativa en Effect
   Así es como se vería el código de tu aplicación consumiendo tu librería @effectify/hatchet.
   import { Effect } from "effect";
   // Importaríamos desde "@effectify/hatchet"
   // import { HatchetClient, HatchetLive, runWorkflow, effectifyStep } from "@effectify/hatchet";

// 1. Definimos un step nativo en Effect
const myEffectStep = (ctx: any) =>
  Effect.gen(function* () {
    yield* Effect.log(`Iniciando step con input: ${JSON.stringify(ctx.workflowInput())}`);

    // Aquí puedes usar otras bondades de Effect, como delays, retries, etc.
    yield* Effect.sleep("2 seconds");

    return { success: true, processedAt: new Date().toISOString() };
  });

// 2. Registramos el worker (generalmente esto se hace al inicio de la app)
const startWorker = Effect.gen(function* () {
  const hatchet = yield* HatchetClient;
  const worker = hatchet.worker("effect-worker");

  // Usamos nuestro wrapper para adaptar el step
  yield* Effect.sync(() => {
    worker.registerWorkflow({
      id: "my-effect-workflow",
      description: "Workflow de prueba nativo en Effect",
      on: { event: "trigger:effect-workflow" },
      steps: [
        {
          name: "step-1",
          // Adaptamos nuestro Effect a la firma que espera el SDK de Hatchet
          run: effectifyStep(myEffectStep),
        },
],
    });
  });

  yield* Effect.log("Iniciando worker de Hatchet...");
  yield* Effect.tryPromise({
    try: () => worker.start(),
    catch: (err) => new HatchetError({ message: "Error al iniciar worker", cause: err })
  });
});

// 3. Ejecutamos un workflow desde algún lugar de tu app
const mainProgram = Effect.gen(function* () {
  yield* Effect.log("Disparando workflow...");

  const result = yield* runWorkflow("my-effect-workflow", {
    message: "Hola desde Effect!"
  });

  yield* Effect.log(`Workflow disparado con ID: ${result.workflowRunId}`);
});

// 4. Unimos todo y proveemos las dependencias
const runnable = Effect.provide(
  Effect.all([startWorker, mainProgram], { concurrency: "unbounded" }),
  HatchetLive
);

// Ejecutamos la aplicación
// Effect.runPromise(runnable);

Puntos clave de este PoC:
 * Aislamiento de Promesas: Tu lógica de negocio principal se mantiene pura trabajando con Effect, y solo tocas Promesas en los bordes (cuando llamas a Hatchet o cuando Hatchet llama a tu worker).
 * Manejo de Errores Tipados: Si Hatchet falla al disparar un workflow, obtienes un HatchetError manejable mediante Effect.catchAll o Effect.catchTag.
 * Inyección Limpia: Gracias a HatchetClient (el Context.Tag), puedes simular fácilmente el SDK en tus tests proporcionando un Layer mockeado en lugar del HatchetLive.
¿Te gustaría que profundicemos en cómo pasar un Runtime de Effect dentro de effectifyStep para que tus steps puedan acceder a otros servicios inyectados (como una base de datos o un logger personalizado) en lugar de estar limitados a dependencias never?[10:06 PM]Si podrías profundizar más y como Hatchet sabría si hay un error y hacer un retry com hatchet si hacemos el catch del error con Effect de lado de la app ? Hatcher creo que detecta los errores throw quiero manejarlo nativamente con Effect
[10:06 PM]Es una excelente pregunta y toca el corazón de cómo integrar dos paradigmas distintos: el manejo de errores funcional de Effect y el sistema de reintentos basado en excepciones de Hatchet.
Para responder a tu duda: "Manejarlo nativamente en Effect" no significa ocultarle el error a Hatchet.
Si dentro de tu step usas Effect.catchAll y devuelves un resultado exitoso, Hatchet dirá "¡Genial, el step funcionó!" y pasará al siguiente paso sin hacer retry. Para que Hatchet sepa que debe reintentar, el Effect debe terminar en un estado de fallo (Failure).
La magia ocurre en nuestro wrapper. Necesitamos hacer dos cosas:
 * Extraer tu Effect usando un Runtime (para que puedas inyectar dependencias como bases de datos en tus steps).
 * Evaluar el resultado del Effect: si es un éxito, devolver la Promesa resuelta; si es un fallo, traducirlo a un throw clásico que Hatchet entienda para disparar su retry.
Aquí tienes cómo evolucionaríamos el código para lograr exactamente esto.

1. El "Effectifier" Avanzado (Manejando Errores y Dependencias)
   En lugar de usar Effect.runPromise a secas, usaremos Runtime.runPromiseExit. Esto nos da el control absoluto sobre el ciclo de vida del Effect antes de entregárselo a Hatchet.
   import { Effect, Runtime, Cause } from "effect";
   import { Context as HatchetContext } from "@hatchet-dev/typescript-sdk";

/**
 * Fábrica para crear nuestro adaptador de steps, inyectándole el Runtime de tu app.
 * Esto permite que tus steps tengan dependencias (R) y no estén limitados a 'never'.
*/
export const createHatchetEffectifier = <R>(runtime: Runtime.Runtime<R>) => {
  // Retornamos la función que adaptará cada step individual
  return <A, E>(
    effectStep: (ctx: HatchetContext<any, any>) => Effect.Effect<A, E, R>
  ) => {
    return async (ctx: HatchetContext<any, any>): Promise<A> => {

      // Ejecutamos el Effect y capturamos su "Exit" (Éxito o Fallo)
      const exit = await Runtime.runPromiseExit(runtime)(effectStep(ctx));

      if (exit._tag === "Success") {
        // Todo salió bien en Effect, le pasamos el valor a Hatchet
        return exit.value;
      } else {
        // El Effect falló (ya sea un error tipado E o un defecto inesperado).
        // Usamos Cause.squash para aplanar el error de Effect a algo manejable.
        const error = Cause.squash(exit.cause);

        // ¡Aquí está la magia para Hatchet! Lanzamos un throw nativo.
        // Esto le dice a Hatchet: "Este step falló, aplica tu política de retries".
        throw error instanceof Error ? error : new Error(String(error));
      }
    };
  };
};

2. Creando un Step con Errores y Dependencias
   Ahora vamos a crear un step que simule interactuar con una base de datos. Usaremos los canales de Effect para fallar a propósito y ver cómo el wrapper hace su trabajo.
   import { Context, Layer } from "effect";

// Simulamos un servicio de Base de Datos
export class Database extends Context.Tag("Database")<
  Database,
  { queryUser: (id: string) => Effect.Effect<any, Error> }

> () {}

export const DatabaseLive = Layer.succeed(Database, {
  queryUser: (id) => Effect.gen(function* () {
    // Simulamos un fallo aleatorio de red para provocar un retry en Hatchet
    const success = Math.random() > 0.5;
    if (!success) {
      yield* Effect.fail(new Error("Timeout en la base de datos"));
    }
    return { id, name: "Usuario Effect" };
  })
});

// Nuestro Step 100% nativo en Effect
const fetchUserStep = (ctx: HatchetContext<any, any>) =>
  Effect.gen(function* () {
    const input = ctx.workflowInput();
    const db = yield* Database; // Usamos nuestra dependencia inyectada

    yield* Effect.log("Intentando obtener usuario...");

    // Si queryUser falla, el flujo se interrumpe aquí y el Effect
    // termina en Failure. El "Effectifier" lo atrapará y hará el throw para Hatchet.
    const user = yield* db.queryUser(input.userId);

    yield* Effect.log("Usuario obtenido con éxito");
    return user;
  });

3. Uniendo Todo: Registrando el Worker con el Runtime
   Para que tu fetchUserStep pueda acceder a la Database, necesitamos crear el Runtime de Effect y pasárselo a nuestro createHatchetEffectifier.
   const startApp = Effect.gen(function* () {
     const hatchet = yield* HatchetClient; // Asumiendo el Tag del ejemplo anterior

  // 1. Obtenemos el runtime actual que ya tiene inyectadas todas tus capas (Database, etc.)
  const runtime = yield* Effect.runtime<Database>();

  // 2. Creamos nuestra función adaptadora inyectándole el runtime
  const effectifyStep = createHatchetEffectifier(runtime);

  const worker = hatchet.worker("effect-worker");

  yield* Effect.sync(() => {
    worker.registerWorkflow({
      id: "fetch-user-workflow",
      description: "Workflow con retries y dependencias",
      on: { event: "trigger:fetch-user" },
      steps: [
        {
          name: "fetch-user",
          // Adaptamos nuestro Effect. ¡Tendrá acceso a la Database!
          // Si falla, Hatchet lo reintentará según su configuración por defecto.
          run: effectifyStep(fetchUserStep),
        },
],
    });
  });

  yield* Effect.tryPromise(() => worker.start());
});

// Proveemos las capas e iniciamos
const runnable = Effect.provide(startApp, DatabaseLive);
// Effect.runPromise(runnable);

Resumen del Flujo de Errores
 * Si ocurre un error de red (Effect.fail): Tu código Effect se detiene. El exit._tag será "Failure". Nuestro wrapper lanza un throw. Hatchet atrapa el throw, marca el intento como fallido y programa el retry.
 * Si el error es crítico y NO quieres que Hatchet reintente: Podrías manejarlo dentro de tu Effect usando Effect.catchAll y devolviendo un objeto que indique fallo en la lógica de negocio (ej. return { status: "FATAL", message: "..." }). Como no hay un throw, Hatchet lo tomará como un step "exitoso" y pasará al siguiente step, donde puedes evaluar ese status.
¿Te gustaría que diseñemos un sistema para tipar y extraer el contexto de Hatchet (por ejemplo, el input o los resultados de steps anteriores) usando el Context nativo de Effect en lugar de pasar la variable ctx como parámetro a la función?[10:06 PM]Buenísima idea procede
[10:07 PM]¡Excelente! Vamos a llevar el PoC al siguiente nivel.
El problema de pasar la variable ctx como parámetro a la función es que rompe un poco la filosofía de Effect. En el ecosistema de Effect, si una pieza de código necesita acceder a información contextual (como el input de un request, o en este caso, el contexto del workflow de Hatchet), lo ideal es declararlo como un requerimiento en el entorno (R) del Effect.
De esta manera, la firma de tu step queda completamente limpia de parámetros de infraestructura.
Aquí tienes cómo construiríamos este sistema de inyección dinámica.

1. El Tag del Contexto de Hatchet
   Primero, creamos un Context.Tag específico para almacenar el contexto que Hatchet nos entrega en cada ejecución de un step.
   import { Context, Effect } from "effect";
   import { Context as HatchetContext } from "@hatchet-dev/typescript-sdk";

// Definimos el Tag.
// Nota: En una librería real, usaríamos genéricos <Input, StepOutput>
// para tipar fuertemente lo que devuelve ctx.workflowInput().
export class HatchetStepContext extends Context.Tag("@effectify/hatchet/StepContext")<
  HatchetStepContext,
  HatchetContext<any, any>

> () {}

2. El "Effectifier" de Inyección Dinámica
   Ahora, actualizamos nuestra función fábrica. En lugar de aceptar una función que recibe ctx, ahora aceptará directamente un Effect que requiere el HatchetStepContext.
   El "Effectifier" se encargará de atrapar el ctx que envía Hatchet en tiempo de ejecución y lo inyectará (Effect.provideService) en tu Effect justo antes de ejecutarlo.
   import { Runtime, Cause } from "effect";

export const createHatchetEffectifier = <R>(runtime: Runtime.Runtime<R>) => {
  return <A, E>(
    // El step ya no es una función. Es un Effect puro que requiere
    // el contexto de Hatchet además de las dependencias de tu app (R)
    effectStep: Effect.Effect<A, E, R | HatchetStepContext>
  ) => {
    return async (ctx: HatchetContext<any, any>): Promise<A> => {

      // 1. Inyectamos el contexto específico de esta ejecución de Hatchet
      const stepWithContext = Effect.provideService(
        effectStep,
        HatchetStepContext,
        ctx
      );

      // 2. Ejecutamos el Effect fusionado con el Runtime de tu app
      const exit = await Runtime.runPromiseExit(runtime)(stepWithContext);

      // 3. Manejamos el resultado (el mismo mecanismo de retries de antes)
      if (exit._tag === "Success") {
        return exit.value;
      } else {
        const error = Cause.squash(exit.cause);
        throw error instanceof Error ? error : new Error(String(error));
      }
    };
  };
};

3. El Step 100% Nativo y Limpio
   Mira cómo queda tu lógica de negocio ahora. Tu step ya no es una función que recibe parámetros raros; es simplemente una descripción de un programa (Effect) que pide lo que necesita.
   // Simulamos el Tag de la base de datos del ejemplo anterior
   // import { Database } from "./mis-servicios";

export const fetchUserStep = Effect.gen(function* () {
  // Extraemos el contexto de Hatchet de forma nativa
  const ctx = yield* HatchetStepContext;

  // Extraemos otras dependencias
  const db = yield* Database;

  // Obtenemos el input tipado del workflow
  const input = ctx.workflowInput();
  yield* Effect.log(`Buscando usuario con ID: ${input.userId}`);

  // Ejecutamos la lógica que puede fallar (y disparar el retry de Hatchet)
  const user = yield* db.queryUser(input.userId);

  return user;
});

Por qué este enfoque es superior:
 * Firmas Limpias: El tipado te dice exactamente qué necesita tu step para funcionar (Database | HatchetStepContext). No hay argumentos ocultos.
 * Composición: Puedes extraer lógica común a funciones auxiliares. Por ejemplo, podrías crear una función const getUserId = Effect.map(HatchetStepContext, ctx => ctx.workflowInput().userId) y usarla en cualquier parte de tu pipeline sin tener que pasar ctx en cascada.
 * Testing Perfecto: Para hacer un test unitario de fetchUserStep, no necesitas levantar un worker de Hatchet. Solo usas Effect.provideService(HatchetStepContext, mockCtx) y listo.
El siguiente nivel: Hatchet tiene una característica excelente donde puedes hacer ctx.log("mensaje") para que los logs aparezcan en su UI en tiempo real. ¿Te gustaría que hagamos un Logger personalizado de Effect para que cuando tú escribas yield* Effect.log("Hola"), este se envíe automáticamente a la UI de Hatchet usando ese mismo ctx inyectado?[10:07 PM]También excelente idea procede
[10:07 PM]¡Manos a la obra! Esta es una de las integraciones más elegantes que puedes hacer, porque te permite mantener tu código completamente agnóstico de Hatchet, mientras aprovechas su UI de observabilidad.
En Effect, cuando usas Effect.log("Hola"), por debajo el sistema envía ese mensaje a todos los Loggers que estén registrados. Los Loggers en Effect tienen acceso al Context (las dependencias) del Fiber (el hilo ligero) que ejecutó el log.
Sabiendo esto, podemos crear un Logger personalizado que intercepte el mensaje, busque si existe el HatchetStepContext en el entorno, y si lo encuentra, lo envíe a la UI de Hatchet.

1. Creando el Logger de Hatchet
   Vamos a usar Logger.make para definir cómo queremos procesar los logs.
   import { Logger, Context, Option, Layer } from "effect";
   // Importamos el tag que creamos en el paso anterior
   // import { HatchetStepContext } from "./context";

export const HatchetLogger = Logger.make(({ logLevel, message, context }) => {
  // 1. Extraemos el mensaje base
  const msg = typeof message === "string" ? message : String(message);

  // 2. Buscamos el contexto de Hatchet dentro del Fiber actual
  const hatchetCtxOpt = Context.getOption(context, HatchetStepContext);

  if (Option.isSome(hatchetCtxOpt)) {
    // 3. ¡Bingo! Estamos dentro de un step de Hatchet.
    // Usamos el método nativo de Hatchet para enviar el log a su UI.
    const ctx = hatchetCtxOpt.value;

    // Hatchet soporta ctx.log(). Le añadimos el nivel de severidad (INFO, ERROR, etc.)
    ctx.log(`[${logLevel.label}] ${msg}`);
  }

  // 4. Mantenemos el log local en consola para el desarrollo
  // (En producción podrías omitir esto o usar un logger JSON)
  console.log(`[${logLevel.label}] ${msg}`);
});

// Creamos una Capa (Layer) que reemplaza el logger por defecto de Effect por el nuestro
export const HatchetLoggerLive = Logger.replace(
  Logger.defaultLogger,
  HatchetLogger
);

2. Actualizando tu Step (¡Cero cambios!)
   Lo hermoso de este enfoque es que tu lógica de negocio no cambia en absoluto. Usas Effect.log como lo harías normalmente en cualquier aplicación Effect.
   export const processPaymentStep = Effect.gen(function* () {
     const ctx = yield* HatchetStepContext;
     const input = ctx.workflowInput();

  // Este log aparecerá automáticamente en tu terminal
  // ¡Y EN LA UI DE HATCHET EN TIEMPO REAL!
  yield* Effect.log(`Iniciando procesamiento de pago para la orden: ${input.orderId}`);

  // ... lógica compleja ...

  if (input.amount > 10000) {
    // También soporta distintos niveles de log
    yield* Effect.logWarning("El monto es inusualmente alto, marcando para revisión");
  }

  yield* Effect.log("Pago procesado con éxito");
  return { status: "success" };
});

3. Inyectando el Logger en tu Aplicación
   Para que el Logger empiece a funcionar, solo tienes que proveer su Layer al momento de arrancar tu aplicación o tu Worker.
   import { Effect } from "effect";

const startWorkerApp = Effect.gen(function* () {
  const hatchet = yield* HatchetClient;
  const runtime = yield* Effect.runtime<HatchetStepContext>(); // + Otras deps
  const effectifyStep = createHatchetEffectifier(runtime);

  const worker = hatchet.worker("payment-worker");

  yield* Effect.sync(() => {
    worker.registerWorkflow({
      id: "payment-workflow",
      description: "Workflow de pagos con logs sincronizados",
      on: { event: "trigger:payment" },
      steps: [
        {
          name: "process-payment",
          run: effectifyStep(processPaymentStep),
        },
],
    });
  });

  yield* Effect.tryPromise(() => worker.start());
});

// Aquí es donde ocurre la magia final.
// Proveemos el Logger a toda la aplicación.
const runnable = Effect.provide(startWorkerApp, HatchetLoggerLive);

// Effect.runPromise(runnable);

El resultado
Con esta arquitectura lograste:
 * Separación de responsabilidades: Tus steps no saben que están enviando logs a internet; solo usan herramientas nativas de Effect.
 * Observabilidad dual: Tienes logs en la consola local (para debuggear rápido) y en el dashboard de Hatchet (para monitoreo del sistema).
 * Código limpio: Sin pasar ctx a funciones anidadas solo para poder loggear un evento.
Para cerrar el círculo de esta arquitectura Effect-native, el único punto débil que nos queda es que ctx.workflowInput() devuelve any, lo cual es peligroso.
¿Te gustaría que te muestre cómo integrar @effect/schema en nuestro "Effectifier" para que el input del workflow sea validado y parseado estrictamente antes de que tu step empiece a ejecutarse?[10:07 PM]Si adelante muestrame
[10:08 PM]¡Perfecto! Este es el toque final para hacer que la librería sea un wrapper robusto, de nivel empresarial.
El principal problema de ctx.workflowInput() es que te devuelve un tipo any. Si cambias la estructura del evento que dispara el workflow, pero olvidas actualizar el step, el código fallará en tiempo de ejecución (o peor, causará bugs silenciosos).
Con @effect/schema, validamos la estructura exacta de los datos antes de que empiece a correr tu lógica de negocio. Si los datos vienen mal formados, el step falla inmediatamente y rechaza la ejecución.

1. El Extractor Validado (Tu nueva herramienta)
   Vamos a crear una función de utilidad en tu librería @effectify/hatchet que se encargue de leer el contexto de Hatchet y pasarlo por un esquema de validación.
   import { Effect } from "effect";
   import * as Schema from "@effect/schema/Schema";
   // import { HatchetStepContext } from "./context";

/**
 * Lee el input del workflow desde el contexto inyectado
 * y lo valida contra un esquema de @effect/schema.
_/
export const getValidatedInput = <A, I, R>(schema: Schema.Schema<A, I, R>) =>
  Effect.gen(function_ () {
    // 1. Obtenemos el contexto (si no está, Effect pedirá inyectarlo)
    const ctx = yield* HatchetStepContext;
    const rawInput = ctx.workflowInput();

    // 2. Creamos el decodificador basado en el esquema
    const decode = Schema.decodeUnknown(schema);

    // 3. Ejecutamos la validación.
    // Si falla, el Effect se interrumpe automáticamente con un ParseError.
    return yield* decode(rawInput);
  });

2. Definiendo el Esquema de tu Input
   En tu aplicación, en lugar de confiar ciegamente en lo que llega, describes exactamente cómo debe ser la forma de los datos usando @effect/schema.
   // schemas.ts
   import * as Schema from "@effect/schema/Schema";

// Definimos un esquema estricto para el pago
export const PaymentInputSchema = Schema.Struct({
  orderId: Schema.String,
  // Podemos añadir validaciones de negocio directamente al esquema:
  amount: Schema.Number.pipe(Schema.positive()),
  currency: Schema.Literal("USD", "EUR", "MXN"),
  customerId: Schema.String
});

// Opcional: Extraemos el tipo de TypeScript para usarlo en otras funciones
export type PaymentInput = Schema.Schema.Type<typeof PaymentInputSchema>;

3. El Step Final: Seguro y Tipado
   Mira cómo se transforma tu lógica de negocio. Es increíblemente limpio y 100% Type-Safe.
   // import { getValidatedInput } from "@effectify/hatchet";
   // import { PaymentInputSchema } from "./schemas";

export const processPaymentStep = Effect.gen(function* () {
  // Magia pura: Extrae, valida y tipa el input en una sola línea.
  const input = yield* getValidatedInput(PaymentInputSchema);

  // ¡A partir de aquí, TypeScript sabe exactamente qué es 'input'!
  // Si intentas hacer input.monto (incorrecto) en lugar de input.amount, el editor se quejará.
  yield* Effect.log(
`Procesando cobro de ${input.amount} ${input.currency} para la orden ${input.orderId}`
  );

  // Si llegamos a esta línea, garantizamos que amount > 0 y currency es válido.
  // ... tu lógica de cobro con base de datos o API externa ...

  return { status: "success", receiptId: "rec_12345" };
});

¿Qué pasa si el Input es inválido? (Manejo de Errores)
Si disparas el workflow y omites el customerId, el Schema.decodeUnknown lanzará un error tipo ParseError.
Como vimos en los pasos anteriores, nuestro "Effectifier" atrapa cualquier error en la capa del Runtime. Así que tomará ese ParseError, lo convertirá en una excepción y se la enviará a Hatchet. En tu panel de Hatchet verás exactamente por qué falló el step (ej. "Missing property customerId"), deteniendo la ejecución antes de causar problemas de consistencia en tu base de datos.
Resumen del Stack @effectify/hatchet
Hasta este punto, hemos construido las bases de una librería increíblemente poderosa:
 * HatchetClient: Inyección limpia del SDK de Hatchet.
 * createHatchetEffectifier: El puente que traduce Effect a Promise y maneja los fallos para que Hatchet haga los retries.
 * HatchetStepContext: Inyección dinámica del contexto sin pasar variables por parámetros.
 * HatchetLogger: Sincronización transparente de los logs nativos de Effect con la UI de Hatchet.
 * getValidatedInput: Parseo estricto y seguro en tiempo de ejecución de los eventos entrantes.
¿Te gustaría que diseñemos un patrón "Builder" o "Router"? Esto nos serviría para que registrar los workflows en tu worker no requiera tanto "boilerplate" de Hatchet, permitiéndote encadenar steps de manera más declarativa y puramente al estilo de Effect.[10:08 PM]Me parece bien el patrón builder
[10:08 PM]¡Excelente! Llegamos a la cereza del pastel.
En Effect, cuando construyes una librería, quieres que la API pública sea declarativa y que maneje la composición de dependencias (R) de forma automática. El problema actual con el registro de Hatchet es que te obliga a mezclar la configuración del worker con la definición de tus steps, y además tienes que llamar a effectifyStep manualmente para cada uno.
Vamos a crear un módulo Workflow usando el patrón Builder (muy similar a cómo funciona Router en @effect/platform o @effect/rpc). Esto nos permitirá encadenar métodos usando pipe e inferir todas las dependencias requeridas.

1. El Módulo Builder (Workflow)
   Primero, definimos una estructura inmutable que irá acumulando la configuración y los steps, manteniendo un registro estricto de los tipos y dependencias (R).
   import { Effect, pipe } from "effect";
   // import { HatchetStepContext } from "./context";

// Definición interna de un step no evaluado
interface StepDefinition<R> {
  name: string;
  effect: Effect.Effect<any, any, R>;
}

// Nuestra estructura principal inmutable
export class HatchetWorkflow<R> {
  constructor(
    readonly id: string,
    readonly desc: string = "",
    readonly triggerEvent: string = "",
    readonly steps: StepDefinition<R>[] = []
  ) {}
}

// --- API del Builder ---

export const Workflow = {
  /** Inicia la definición de un nuevo workflow */
  make: (id: string): HatchetWorkflow<never> =>
    new HatchetWorkflow(id),

  /** Añade una descripción */
  description: (desc: string) => <R>(wf: HatchetWorkflow<R>) =>
    new HatchetWorkflow(wf.id, desc, wf.triggerEvent, wf.steps),

  /** Define el evento que lo dispara */
  onEvent: (event: string) => <R>(wf: HatchetWorkflow<R>) =>
    new HatchetWorkflow(wf.id, wf.desc, event, wf.steps),

  /** * Añade un step.
   * ¡Magia de TS!: Combina las dependencias previas (R) con las del nuevo step (R2)
*/
  addStep: <A, E, R2>(name: string, effect: Effect.Effect<A, E, R2>) =>
<R>(wf: HatchetWorkflow<R>): HatchetWorkflow<R | R2> =>
      new HatchetWorkflow(wf.id, wf.desc, wf.triggerEvent, [
        ...wf.steps,
        { name, effect } as any
])
};

2. El Registrador de Workflows (Worker Wrapper)
   Ahora necesitamos una función que tome este HatchetWorkflow declarativo y haga todo el "trabajo sucio": obtener el Runtime, crear el Effectifier y registrar todo en el SDK nativo de Hatchet.
   import { Effect } from "effect";
   // import { createHatchetEffectifier } from "./effectifier";
   // import { HatchetClient } from "./client";

export const registerWorkflow = <R>(
  workerName: string,
  workflow: HatchetWorkflow<R>
): Effect.Effect<void, never, R | HatchetClient> =>
  Effect.gen(function* () {
    // 1. Obtenemos el cliente inyectado
    const hatchet = yield* HatchetClient;
    const worker = hatchet.worker(workerName);

    // 2. Extraemos el Runtime con TODAS las dependencias (R) acumuladas en el builder
    const runtime = yield* Effect.runtime<R>();

    // 3. Creamos nuestra fábrica de adaptadores con ese runtime
    const effectify = createHatchetEffectifier(runtime);

    // 4. Transformamos nuestro builder al formato que espera Hatchet
    yield* Effect.sync(() => {
      worker.registerWorkflow({
        id: workflow.id,
        description: workflow.desc,
        on: { event: workflow.triggerEvent },
        steps: workflow.steps.map(step => ({
          name: step.name,
          // Convertimos cada Effect en una Promise de Hatchet aquí mismo
          run: effectify(step.effect)
        }))
      });
    });

    yield* Effect.log(`Workflow '${workflow.id}' registrado en worker '${workerName}'`);

    // 5. Iniciamos el worker
    yield* Effect.tryPromise(() => worker.start()).pipe(
      Effect.catchAllCause(cause => Effect.logError("Error iniciando worker", cause))
    );
  });

3. El Resultado Final: Tu App Nativa en Effect
   Mira cómo queda la experiencia de desarrollo de quien usa tu librería. Es código puro, declarativo, funcional y altamente tipado.
   import { Effect, pipe } from "effect";
   // Importaciones de tu app
   // import { processPaymentStep, sendEmailStep, Database, EmailService } from "./mis-servicios";
   // Importaciones de tu librería
   // import { Workflow, registerWorkflow, HatchetLive, HatchetLoggerLive } from "@effectify/hatchet";

// 1. Construimos el Workflow declarativamente
const paymentWorkflow = pipe(
  Workflow.make("payment-workflow"),
  Workflow.description("Procesa el pago y envía un recibo"),
  Workflow.onEvent("trigger:payment"),
  Workflow.addStep("process-payment", processPaymentStep), // Requiere Database
  Workflow.addStep("send-email", sendEmailStep)            // Requiere EmailService
);

// En este punto, TypeScript sabe que paymentWorkflow es de tipo:
// HatchetWorkflow<Database | EmailService | HatchetStepContext>

// 2. Creamos el programa principal
const mainProgram = registerWorkflow("pagos-worker", paymentWorkflow);

// 3. Proveemos las dependencias y ejecutamos
const runnable = Effect.provide(
  mainProgram,
  // Proveemos todas las capas necesarias
  Effect.all([
    HatchetLive,
    HatchetLoggerLive,
    DatabaseLive,
    EmailServiceLive
])
);

// Boom.
// Effect.runPromise(runnable);

¿Por qué este patrón es brillante?
 * Inferencia de Dependencias Perfecta: Si en el futuro añades un tercer paso Workflow.addStep("audit", auditStep) que requiere un AuditService, TypeScript inmediatamente te marcará un error en Effect.provide exigiéndote que proveas el AuditServiceLive. Cero bugs en producción por dependencias faltantes.
 * Cero Boilerplate: El desarrollador de la app no tiene que lidiar con Promesas, contextos oscuros, ni adaptadores. Solo define sus pasos como Effect y los une con el Workflow.make.
 * Escalabilidad: Puedes tener un archivo separado que exporte un array de HatchetWorkflow y luego iterarlos en tu programa principal para registrarlos todos de un golpe en el worker.
Con esto, tienes esencialmente una librería completa, moderna y lista para producción. Combina la robustez de Hatchet (concurrencia, retries, observabilidad) con la seguridad y composición de Effect (tipado estricto, inyección de dependencias, manejo de errores funcional).
¿Te gustaría repasar algún punto en particular de este PoC, o crees que tienes lo suficiente para empezar a codificar la librería real?
