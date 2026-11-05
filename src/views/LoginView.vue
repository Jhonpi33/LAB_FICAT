<script setup>
/**
 * /views/LoginView.vue
 * Pantalla de inicio de sesión. Es la RAÍZ de la aplicación ("/").
 *
 * Recorrido del token:
 *   1. Esta vista manda email y contraseña a POST /auth/login.
 *   2. El backend responde { ok, mensaje, datos: { token, usuario } }.
 *   3. Se guarda en el store Auth (persistido en localStorage).
 *   4. /plugins/axios.js manda el token Bearer en todas las peticiones.
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { post } from '@/services/api.service'
import { useAuthStore } from '@/store/Auth'
import { useGeneralStore } from '@/store/General'
import { useNotificar } from '@/composables/useNotificar'
import { requerido, esEmail } from '@/utils/reglas'
import logoSena from '@/assets/logo-sena.svg'

const router = useRouter()
const auth = useAuthStore()
const general = useGeneralStore()
const { notificarOk, notificarError } = useNotificar()

const formulario = ref({ email: '', password: '' })
const verPassword = ref(false)
const enviando = ref(false)

const iniciarSesion = async () => {
  enviando.value = true

  try {
    const respuesta = await post('/auth/login', {
      email: formulario.value.email.trim(),
      password: formulario.value.password,
    })

    auth.guardarSesion(respuesta.datos)

    notificarOk(`Bienvenido, ${auth.nombreUsuario}`)
    router.push({ name: 'panel' })
  } catch (e) {
    notificarError(e)
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <!--
    Pantalla dividida: marca del laboratorio a la izquierda y formulario a la
    derecha. OJO: esta vista NO va dentro de un layout, por eso no se usa
    <q-page> sino un div propio que ocupa toda la ventana.
  -->
  <div class="pantalla-login">
    <!-- LADO IZQUIERDO: identidad del laboratorio -->
    <aside class="lado-marca">
      <div class="contenido-marca">
        <div class="marca">
          <img :src="logoSena" alt="Logo SENA" class="logo-sena" width="56" height="56" />
          <div class="marca-texto">
            <div class="nombre-marca">
              <span>LAB</span><span class="nombre-marca--acento">FICAT</span>
            </div>
            <div class="eslogan-marca">Calidad y trazabilidad en cada análisis</div>
          </div>
        </div>

        <div class="frase-marca">
          <h1 class="titulo-marca">
            Servicio de análisis<br />de laboratorio
          </h1>
          <p class="texto-marca">
            Clientes, solicitudes, muestras y resultados en un solo sistema.
          </p>
        </div>

        <ul class="beneficios">
          <li><q-icon name="check_circle" size="18px" />Trazabilidad completa de cada muestra</li>
          <li><q-icon name="check_circle" size="18px" />Resultados en línea para los clientes</li>
          <li><q-icon name="check_circle" size="18px" />Control de calidad del laboratorio</li>
        </ul>
      </div>

      <!-- Decoración: círculos, matraz y burbujas de laboratorio -->
      <div class="decoracion circulo circulo-1"></div>
      <div class="decoracion circulo circulo-2"></div>
      <div class="decoracion circulo circulo-3"></div>
      <q-icon name="science" class="decoracion matraz" />

      <div class="burbujas" aria-hidden="true">
        <span class="burbuja burbuja--blanca" style="--x: 6%; --s: 12px; --dur: 9s; --d: 0s"></span>
        <span class="burbuja burbuja--blanca" style="--x: 16%; --s: 8px; --dur: 11s; --d: 1.2s"></span>
        <span class="burbuja burbuja--blanca" style="--x: 28%; --s: 16px; --dur: 8s; --d: 2.4s"></span>
        <span class="burbuja burbuja--blanca" style="--x: 42%; --s: 10px; --dur: 12s; --d: 0.6s"></span>
        <span class="burbuja burbuja--blanca" style="--x: 55%; --s: 7px; --dur: 9.5s; --d: 3s"></span>
        <span class="burbuja burbuja--blanca" style="--x: 68%; --s: 14px; --dur: 10s; --d: 1.8s"></span>
        <span class="burbuja burbuja--blanca" style="--x: 78%; --s: 9px; --dur: 11.5s; --d: 0.3s"></span>
        <span class="burbuja burbuja--blanca" style="--x: 90%; --s: 12px; --dur: 8.5s; --d: 2.8s"></span>
      </div>
    </aside>

    <!-- LADO DERECHO: formulario de acceso -->
    <main class="lado-formulario">
      <!-- Marca compacta: solo aparece en pantallas pequeñas -->
      <div class="marca-movil">
        <img :src="logoSena" alt="Logo SENA" class="logo-sena-movil" width="34" height="34" />
        <span class="nombre-marca-movil">LAB<span class="nombre-marca--acento">FICAT</span></span>
      </div>

      <!-- Fondo dinámico: manchas de color difuminadas (como reactivos) -->
      <div class="manchas" aria-hidden="true">
        <span class="mancha mancha-1"></span>
        <span class="mancha mancha-3"></span>
      </div>

      <!-- Burbujas ascendentes -->
      <div class="burbujas burbujas--derecha" aria-hidden="true">
        <span class="burbuja burbuja--verde" style="--x: 10%; --s: 14px; --dur: 12s; --d: 0s"></span>
        <span class="burbuja burbuja--verde" style="--x: 22%; --s: 9px; --dur: 10s; --d: 1.5s"></span>
        <span class="burbuja burbuja--verde" style="--x: 35%; --s: 18px; --dur: 13s; --d: 2.9s"></span>
        <span class="burbuja burbuja--verde" style="--x: 48%; --s: 11px; --dur: 9.5s; --d: 0.8s"></span>
        <span class="burbuja burbuja--verde" style="--x: 60%; --s: 8px; --dur: 11.5s; --d: 2.1s"></span>
        <span class="burbuja burbuja--verde" style="--x: 72%; --s: 15px; --dur: 10.5s; --d: 0.4s"></span>
        <span class="burbuja burbuja--verde" style="--x: 84%; --s: 10px; --dur: 12.5s; --d: 2.6s"></span>
        <span class="burbuja burbuja--verde" style="--x: 94%; --s: 13px; --dur: 9s; --d: 1.1s"></span>
      </div>

      <div class="columna-login">
        <q-card flat class="tarjeta-login">
          <q-card-section class="q-pb-none">
            <div class="text-h5 text-weight-bold">Iniciar sesión</div>
            <p class="texto-suave text-body2">
              Ingresa con tu cuenta para gestionar el laboratorio.
            </p>
          </q-card-section>

          <q-form greedy @submit="iniciarSesion">
            <q-card-section class="q-gutter-md">
              <q-input
                v-model="formulario.email"
                outlined
                type="email"
                label="Email *"
                autocomplete="email"
                autofocus
                :rules="[requerido('El email'), esEmail()]"
                lazy-rules
              >
                <template #prepend>
                  <q-icon name="mail" />
                </template>
              </q-input>

              <q-input
                v-model="formulario.password"
                outlined
                label="Contraseña *"
                autocomplete="current-password"
                :type="verPassword ? 'text' : 'password'"
                :rules="[requerido('La contraseña')]"
                lazy-rules
              >
                <template #prepend>
                  <q-icon name="lock" />
                </template>
                <template #append>
                  <q-icon
                    :name="verPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="verPassword = !verPassword"
                  />
                </template>
              </q-input>
            </q-card-section>

            <q-card-actions class="q-px-md q-pb-md">
              <q-btn
                unelevated
                no-caps
                type="submit"
                color="primary"
                class="full-width boton-entrar"
                label="Entrar"
                :loading="enviando"
              />
            </q-card-actions>
          </q-form>

          <q-separator />

          <q-card-section class="text-caption texto-suave">
            <div class="cuentas-demo">
              <q-icon name="badge" size="14px" class="q-mr-xs" />
              Cuentas de demostración
              <div class="cuentas-demo__lista">
                <div class="cuenta">
                  <span class="cuenta__email">admin@sena.edu.co</span>
                  <span class="cuenta__pass">Admin2026</span>
                </div>
                <div class="cuenta">
                  <span class="cuenta__email">lab@sena.edu.co</span>
                  <span class="cuenta__pass">Laboratorio2026</span>
                </div>
              </div>
            </div>

            <!-- Acceso para clientes: tarjeta clicable con jerarquía clara -->
            <router-link :to="{ name: 'seguimiento' }" class="cta-consulta">
              <span class="cta-consulta__icono">
                <q-icon name="science" size="22px" />
              </span>
              <span class="cta-consulta__texto">
                <span class="cta-consulta__titulo">¿Eres cliente?</span>
                <span class="cta-consulta__sub">Consulta el estado de tu muestra</span>
              </span>
              <q-icon name="arrow_forward" size="18px" class="cta-consulta__flecha" />
            </router-link>
          </q-card-section>
        </q-card>

        <p class="text-center text-caption texto-suave q-mt-md q-mb-none">
          <q-icon name="dns" size="14px" class="q-mr-xs" />{{ general.urlApi }}
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
// Colores locales derivados del verde de marca (no se tocan variables.scss).
$verde-marca: #2e7d32;
$verde-oscuro: #1b5e20;
$verde-claro: #43a047;
$verde-suave: #c8e6c9;

// ==============================
// ESTRUCTURA DE LA PANTALLA
// ==============================
.pantalla-login {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(380px, 44%) 1fr;
  background: #fafafa;
}

// ==============================
// LADO IZQUIERDO (MARCA)
// ==============================
.lado-marca {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px;
  color: #fff;
  background:
    radial-gradient(900px 500px at 110% -10%, rgba(255, 255, 255, 0.14), transparent 60%),
    linear-gradient(155deg, $verde-oscuro 0%, $verde-marca 55%, $verde-claro 115%);
}

.contenido-marca {
  position: relative;
  z-index: 1;
  max-width: 460px;
}

// Wordmark del proyecto: tipografía pesada, espaciada y con acento de
// color en la segunda mitad del nombre.
.nombre-marca {
  font-size: 2.1rem;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}

.nombre-marca--acento {
  color: $verde-suave;
}

.marca {
  display: flex;
  align-items: center;
  gap: 14px;

  img {
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25));
  }
}

.marca-texto {
  flex: 1;
  min-width: 0;
}

// Logo oficial del SENA (verde), presentado sobre una pastilla blanca para
// que resalte sobre el fondo verde.
.logo-sena {
  flex-shrink: 0;
  padding: 6px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 14px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
}

.eslogan-marca {
  font-size: 13px;
  opacity: 0.85;
  margin-top: 8px;
}

.frase-marca {
  margin-top: 64px;
}

.titulo-marca {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.15;
  margin: 0;
  letter-spacing: -0.5px;
}

.texto-marca {
  margin: 16px 0 0;
  font-size: 16px;
  line-height: 1.6;
  opacity: 0.9;
}

.beneficios {
  list-style: none;
  margin: 40px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);

    .q-icon {
      color: $verde-suave;
    }
  }
}

// Círculos decorativos y matraz de fondo.
.decoracion {
  position: absolute;
  pointer-events: none;
}

.decoracion.circulo {
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.05);
}

.circulo-1 {
  width: 340px;
  height: 340px;
  right: -120px;
  top: -100px;
}

.circulo-2 {
  width: 180px;
  height: 180px;
  left: -70px;
  bottom: 90px;
}

.circulo-3 {
  width: 60px;
  height: 60px;
  right: 70px;
  bottom: -20px;
}

.decoracion.matraz {
  right: -30px;
  bottom: -40px;
  font-size: 260px;
  color: rgba(255, 255, 255, 0.07);
  animation: balancear 7s ease-in-out infinite;
  transform-origin: 70% 80%;
}

// El matraz se mece suavemente, como si tuviera líquido dentro.
@keyframes balancear {
  0%,
  100% {
    transform: rotate(-8deg);
  }
  50% {
    transform: rotate(5deg);
  }
}

// ==============================
// BURBUJAS (efervescencia de laboratorio)
// ==============================
.burbujas {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.burbuja {
  position: absolute;
  bottom: -60px;
  left: var(--x, 50%);
  width: var(--s, 12px);
  height: var(--s, 12px);
  border-radius: 50%;
  animation: flotar var(--dur, 10s) linear var(--d, 0s) infinite;
}

.burbuja--blanca {
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.08) 70%);
  border: 1px solid rgba(255, 255, 255, 0.45);
}

.burbuja--verde {
  background: radial-gradient(circle at 30% 30%, rgba(46, 125, 50, 0.5), rgba(102, 187, 106, 0.1) 70%);
  border: 1px solid rgba(46, 125, 50, 0.35);
}

@keyframes flotar {
  0% {
    transform: translateY(0) translateX(0) scale(0.6);
    opacity: 0;
  }
  8% {
    opacity: 0.7;
  }
  50% {
    transform: translateY(-42vh) translateX(14px) scale(1);
  }
  92% {
    opacity: 0.7;
  }
  100% {
    transform: translateY(-88vh) translateX(-10px) scale(0.9);
    opacity: 0;
  }
}

// ==============================
// LADO DERECHO (FORMULARIO)
// ==============================
.lado-formulario {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
  background:
    radial-gradient(1100px 650px at 88% 8%, #e8f5e9 0%, transparent 55%),
    radial-gradient(900px 600px at 12% 92%, #fff3e0 0%, transparent 55%),
    #fafafa;
}

// Manchas de color difuminadas detrás del vidrio: parecen reactivos
// moviéndose dentro de un matraz.
.manchas {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.mancha {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.55;
  animation: latir 14s ease-in-out infinite alternate;
}

.mancha-1 {
  width: 420px;
  height: 420px;
  top: -120px;
  right: -80px;
  background: #a5d6a7;
}

.mancha-3 {
  width: 260px;
  height: 260px;
  top: 40%;
  left: 55%;
  background: #c8e6c9;
  animation-delay: -9s;
  animation-duration: 16s;
}

@keyframes latir {
  from {
    transform: translate(0, 0) scale(1);
  }
  to {
    transform: translate(30px, -20px) scale(1.15);
  }
}

// Marca compacta: oculta en escritorio, visible en pantallas pequeñas.
.marca-movil {
  display: none;
}

.logo-sena-movil {
  padding: 3px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  flex-shrink: 0;
}

.nombre-marca-movil {
  flex: 1;
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.columna-login {
  position: relative;
  z-index: 1;
  width: 420px;
  max-width: 92vw;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
}

// Tarjeta con efecto vidrio (glassmorphism): translúcida y con desenfoque
// del fondo detrás de ella.
.tarjeta-login {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: 0 14px 44px rgba(27, 94, 32, 0.18);
  animation: aparecer 0.5s ease;
}

@keyframes aparecer {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.boton-entrar {
  height: 44px;
  font-weight: 600;
  border-radius: 10px;
}

// ==============================
// ACCESO PARA CLIENTES (CTA)
// Tarjeta clicable con icono, jerarquía de textos y flecha que responde
// al mouse. Más profesional que un botón de contorno plano.
// ==============================
.cta-consulta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #c8e6c9;
  background: linear-gradient(135deg, #f2f9f2 0%, #e8f5e9 100%);
  text-decoration: none;
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;

  &:hover {
    border-color: #81c784;
    box-shadow: 0 6px 16px rgba(46, 125, 50, 0.16);
    transform: translateY(-1px);
  }
}

.cta-consulta__icono {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2e7d32, #43a047);
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 3px 8px rgba(46, 125, 50, 0.35);
}

.cta-consulta__texto {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  text-align: left;
}

.cta-consulta__titulo {
  font-size: 14px;
  font-weight: 700;
  color: #1b5e20;
  line-height: 1.3;
}

.cta-consulta__sub {
  font-size: 12px;
  color: #616161;
  line-height: 1.3;
}

.cta-consulta__flecha {
  color: #2e7d32;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.cta-consulta:hover .cta-consulta__flecha {
  transform: translateX(3px);
}

// Cuentas de demostración, presentadas como filas ordenadas.
.cuentas-demo {
  margin-bottom: 16px;
}

.cuentas-demo__lista {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cuenta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
}

.cuenta__email {
  font-weight: 600;
  color: #424242;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cuenta__pass {
  font-family: 'Roboto Mono', 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #616161;
  background: #f1f3f5;
  padding: 2px 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

// Inputs más redondeados y con fondo translúcido, a juego con el vidrio.
:deep(.q-field--outlined .q-field__control) {
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.55);
}

// ==============================
// RESPONSIVE
// En pantallas chicas la marca se convierte en una cabecera compacta.
// ==============================
@media (max-width: 900px) {
  .pantalla-login {
    grid-template-columns: 1fr;
  }

  .lado-marca {
    display: none;
  }

  .marca-movil {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    background: linear-gradient(155deg, $verde-oscuro, $verde-marca);
    color: #fff;
    font-weight: 700;
  }

  .lado-formulario {
    align-items: center;
    padding-top: 96px;
  }
}
</style>
