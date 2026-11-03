# Despliegue Costo Cero en Oracle Cloud Always Free

Esta guía te lleva paso a paso para montar toda la plataforma Floa GPS (Base de Datos PostgreSQL, servidor GPS Traccar, API Express y Túnel Cloudflare) en la capa gratuita de por vida de Oracle Cloud.

---

## 1. Crear Cuenta y Máquina Virtual (Ampere A1)

1. Regístrate en [Oracle Cloud](https://www.oracle.com/cloud/free/). Te solicitará una tarjeta para verificación de identidad (cargo temporal reembolsable de \$1 USD).
2. En el panel principal ve a **Compute** > **Instances** > **Create instance**.
3. Selecciona:
   - **Image**: Ubuntu 22.04 o 24.04 Minimal LTS.
   - **Shape**: `Ampere (Arm-based Processor)` -> `VM.Standard.A1.Flex`. Puedes asignar hasta **4 OCPUs** y **24 GB de RAM** completamente gratis (con 2 OCPUs y 8 GB de RAM vas sobrado para empezar).
   - **Networking**: Asignar IP pública IPv4 automática.
   - **SSH Keys**: Descarga la clave privada `.key` para entrar a la máquina.

---

## 2. Abrir Puertos de Red en Oracle (VCN Security List)

1. En la página de detalles de tu instancia, haz clic en tu **Subnet** y luego en la **Default Security List**.
2. Agrega una **Ingress Rule** para el tráfico de los dispositivos GPS:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: TCP
   - **Destination Port Range**: `5033, 5023`
3. Agrega otra **Ingress Rule** idéntica pero con protocolo **UDP** (el Cellocator puede configurarse por TCP o UDP en el puerto `5033`).

---

## 3. Preparar la Máquina e Instalar Docker

Conéctate por terminal a tu máquina:
```bash
ssh -i tu_clave.key ubuntu@TU_IP_PUBLICA
```

Ejecuta para actualizar y permitir los puertos en el firewall de Ubuntu (`iptables` / `ufw`):
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 5033 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p udp --dport 5033 -j ACCEPT
sudo netfilter-persistent save

# Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
newgrp docker
```

---

## 4. Clonar el Proyecto y Configurar

```bash
git clone https://github.com/TU_USUARIO/floa-gps.git
cd floa-gps/infra

# Crear el archivo de variables reales
cp .env.example .env
nano .env
```
Rellena las contraseñas y claves seguras en `.env`.

---

## 5. Exponer la API con Cloudflare Tunnel (Gratis)

1. Crea una cuenta gratuita en [Cloudflare](https://dash.cloudflare.com).
2. Ve a **Zero Trust** > **Networks** > **Tunnels** > **Create a tunnel**.
3. Ponle nombre (ej. `floa-api`), elige **Docker** y copia el token que te da.
4. Pega ese token en tu variable `TUNNEL_TOKEN` dentro de `infra/.env`.
5. En la pestaña **Public Hostname** del túnel, vincula un subdominio (ej: `api.tudominio.com` o el que uses) apuntando a:
   - **Service**: `HTTP`
   - **URL**: `api:3001`

---

## 6. Iniciar los Servicios

Dentro de `floa-gps/infra`:
```bash
docker compose up -d --build
```

Verifica el estado con:
```bash
docker compose ps
docker compose logs -f api
```

Listo: tu API estará corriendo segura con HTTPS vía Cloudflare, la base de datos PostgreSQL persistida en disco (hasta 200 GB gratis) y Traccar escuchando en el puerto `5033` para conectar tus dispositivos GPS Cellocator.
