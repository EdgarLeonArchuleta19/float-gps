# Configuración y Vinculación del Cellocator CR300B (3G/Lite)

Esta guía explica detalladamente cómo preparar, programar y vincular un rastreador GPS **Cellocator CR300B** con Floa GPS y Traccar.

---

## 1. El Identificador: Unit ID vs. IMEI (¡Muy Importante!)

A diferencia de los rastreadores genéricos que transmiten su número IMEI de 15 dígitos en los paquetes de datos, la familia **Cellocator utiliza su Unit ID** interno (generalmente un entero de 7 a 9 dígitos impreso en el código de barras/etiqueta como `Unit ID` o `S/N`).

- **En Traccar**: El campo `Identifier` o `uniqueId` debe ser exactamente ese **Unit ID**.
- **En Floa GPS**: En el formulario de *Agregar Vehículo* o *Agregar GPS*, en el campo etiquetado como `IMEI`, ingresa ese mismo número **Unit ID**. De esta manera el puente enlaza los datos correctamente.

---

## 2. Prueba Gratuita Inmediata (Antes de montar Oracle)

Para validar que el equipo enciende, tiene señal celular y reporta coordenadas antes de configurar tu servidor propio:

1. Entra a [demo.traccar.org](https://demo.traccar.org) (o cualquiera de los servidores demo públicos de Traccar).
2. Regístrate gratis y agrega un dispositivo poniendo el **Unit ID** de tu CR300B.
3. Programa el CR300B apuntando a la IP/dominio del servidor demo seleccionado, en el puerto **5033** (TCP).
4. Al salir al exterior, verás la posición en el mapa de demostración. Esto confirma que el chip celular, el GPS y la antena funcionan al 100%.

---

## 3. Configuración con Cellocator Programmer

Se requiere el cable serial/USB de programación oficial de Cellocator y el software de escritorio **Cellocator Programmer**:

1. **Conexión de Alimentación**:
   - Cable **Rojo**: +12V / +24V (Batería permanente).
   - Cable **Negro**: Tierra (GND).
   - Cable **Blanco** (Ignición / VCC Switch): Conectar a +12V para simular encendido en banco de pruebas.
2. **Parámetros de Red Móvil (APN)**:
   - **Telcel México**:
     - APN: `internet.itelcel.com`
     - Usuario: `webgprs`
     - Contraseña: `webgprs2002`
   - **AT&T México**:
     - APN: `modem.nexteldata.com.mx` (o el APN corporativo provisto con tu SIM M2M).
3. **Servidor de Destino**:
   - **IP / Host**: La IP pública de tu servidor Oracle o tu dominio configurado.
   - **Puerto**: `5033`
   - **Protocolo**: TCP (o UDP según preferencia; TCP garantiza entrega con ACKs).
4. **Frecuencias de Reporte Recomendadas**:
   - En movimiento (Ignición ON): cada `30` o `60` segundos (consume aprox. 10 a 15 MB al mes).
   - Detenido (Ignición OFF): cada `30` o `60` minutos (para ahorro extremo de datos y batería).

---

## 4. Alerta de Seguridad: Paro de Motor (Inmovilizador)

El Cellocator cuenta con una salida digital a colector abierto (típicamente cable **Amarillo**) diseñada para activar un relevador (*relay*) automotriz de 5 pines:

> [!CAUTION]
> **NUNCA pruebes el paro de motor en un vehículo en marcha o en carretera.**
> 1. Realiza la primera prueba en banco con un multímetro o un LED conectado al relevador.
> 2. Si se instala en el vehículo, conéctalo al circuito de corte de marcha (*starter*) o bomba de gasolina, y pruébalo siempre con el coche estacionado y frenado.

En Floa GPS, al presionar **Apagar Motor**, la plataforma solicita a Traccar el envío del comando nativo Cellocator a través del puerto 5033 y guarda un registro de auditoría en la Bitácora.
