

export const SUPPORT = {
  address: 'Culiacán, Sinaloa / Monterrey, N.L.',
  hours: 'Lunes a Sábado · 8:00 – 18:00',
  phone: '+52 667 000 0000',
  email: 'soporte@floagps.com',
};

export const GROUPS = [
  {
    title: 'Conectividad y señal GPS',
    items: [
      {
        q: 'Una unidad aparece "Sin señal" u offline',
        a: 'Verifica que el dispositivo cuente con alimentación constante de 12V/24V y que la SIM tenga saldo y datos activos. Tras una instalación nueva o al salir de un sótano puede tardar hasta 5 minutos en fijar satélites.',
      },
      {
        q: 'La posición no se actualiza en el mapa',
        a: 'Los equipos reportan cada 30-60 segundos en movimiento y cada 30-60 minutos estacionados. Si la unidad está en marcha y no actualiza, revisa la cobertura celular o que la antena GPS no esté cubierta por metal.',
      },
    ],
  },
  {
    title: 'Paro de motor y acciones rápidas',
    items: [
      {
        q: '¿Cómo funciona el paro de motor desde la app?',
        a: 'Toca una unidad en el mapa, elige "Motor" y confirma con tu huella, Face ID o contraseña. El comando activa el relevador del GPS. Úsalo solo con la unidad detenida o en caso de robo.',
      },
      {
        q: '¿Qué hace "Seguir unidad"?',
        a: 'Centra la cámara automáticamente en la unidad y actualiza su posición cada pocos segundos. Si mueves el mapa con el dedo, el seguimiento se desactiva.',
      },
      {
        q: '¿Cómo llego hasta una unidad?',
        a: 'Con "Cómo llegar" se abre Google Maps, Apple Maps o Waze con las coordenadas exactas de la última posición reportada.',
      },
    ],
  },
  {
    title: 'Instalación y acceso',
    items: [
      {
        q: '¿Cómo instalo floaGPS en mi celular?',
        a: 'En Android abre el enlace en Chrome y elige "Instalar aplicación". En iPhone usa Compartir en Safari y "Agregar a pantalla de inicio".',
      },
      {
        q: 'Olvidé mi contraseña',
        a: 'En la pantalla de inicio de sesión toca "¿Olvidaste tu contraseña?" y te enviaremos una contraseña temporal a tu correo registrado.',
      },
    ],
  },
];
