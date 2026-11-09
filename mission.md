# Misión

Desarrollar una aplicación de gestión financiera sencilla, rápida e intuitiva para pequeños negocios, permitiendo registrar la actividad diaria en pocos segundos y obtener una visión clara de la rentabilidad del negocio sin necesidad de conocimientos de contabilidad.

La aplicación debe priorizar la simplicidad y la experiencia de usuario por encima de la cantidad de funcionalidades. Cada decisión de diseño y desarrollo debe contribuir a que el usuario invierta el menor tiempo posible en registrar su información diaria y pueda consultar el estado de su negocio de un vistazo.

El objetivo no es construir una herramienta compleja de gestión empresarial, sino una aplicación especializada que resuelva un problema muy concreto de la mejor forma posible.

---

# Qué construimos

Una aplicación enfocada en el control económico diario de un pequeño negocio.

## Piezas principales

### Registro diario

Cada día permite registrar:

- Total vendido (€)
- Coste de la inversión (€)
- Gastos adicionales (€)
- Notas

Toda la información queda asociada a una fecha concreta mediante un calendario.

---

### Calendario

- Visualización mensual.
- Selección rápida de cualquier día.
- Acceso inmediato al registro diario.
- Indicadores visuales para distinguir días con información registrada.

---

### Cálculos automáticos

La aplicación calcula automáticamente:

- Beneficio bruto = Ventas − Inversión.
- Beneficio neto = Ventas − Inversión − Gastos adicionales.

El usuario nunca tendrá que realizar cálculos manuales.

---

### Estadísticas

Resumen mensual con indicadores como:

- Total vendido.
- Total invertido.
- Total de gastos adicionales.
- Beneficio bruto.
- Beneficio neto.
- Beneficio medio diario.
- Salario estimado (30 % del total vendido).

En futuras versiones podrán añadirse estadísticas más avanzadas sin modificar la arquitectura principal.

---

### Experiencia de uso

La aplicación debe permitir:

- Registrar un día completo en menos de 20 segundos.
- Consultar la información de cualquier fecha con uno o dos clics.
- Comprender el estado del negocio sin necesidad de interpretar tablas complejas.

---

# Para quién

La aplicación está dirigida principalmente a:

- Autónomos.
- Pequeños comercios.
- Negocios familiares.
- Emprendedores.
- Personas que venden productos o prestan servicios y desean controlar fácilmente la rentabilidad diaria.

Está pensada para usuarios que:

- No utilizan programas de contabilidad.
- No necesitan herramientas empresariales complejas.
- Quieren saber rápidamente cuánto han vendido y cuánto han ganado.
- Valoran la rapidez y la simplicidad por encima de disponer de cientos de opciones.

El usuario objetivo probablemente abrirá la aplicación varias veces al día, por lo que la velocidad de uso es una prioridad absoluta.

---

# Principios

## Simplicidad

Cada pantalla debe tener un propósito claro.

Si una funcionalidad no aporta valor directo al usuario, no debe existir.

---

## Rapidez

Registrar un día debe requerir el menor número posible de acciones.

Cada interacción debe sentirse inmediata.

---

## Claridad

El usuario debe entender la aplicación sin necesidad de leer un manual.

La interfaz debe guiar naturalmente el flujo de trabajo.

---

## Automatización

Todo aquello que pueda calcular la aplicación debe hacerse automáticamente.

Nunca se pedirá al usuario información que pueda deducirse.

---

## Diseño minimalista

Espacios amplios.

Pocos colores.

Jerarquía visual clara.

Nada de elementos decorativos innecesarios.

La información importante debe destacar de forma natural.

---

## Escalabilidad

Aunque la primera versión sea sencilla, la arquitectura debe permitir incorporar en el futuro funcionalidades como:

- Varios negocios.
- Varios usuarios.
- Clientes.
- Proveedores.
- Exportación a PDF.
- Exportación a Excel.
- Copias de seguridad.
- Sincronización en la nube.
- Paneles de estadísticas.
- Autenticación.
- Aplicación móvil.

Sin necesidad de rediseñar la base del proyecto.

---

## Calidad del software

Todo el código debe ser:

- Modular.
- Reutilizable.
- Escalable.
- Fácil de mantener.
- Bien estructurado.
- Consistente.
- Preparado para crecer.

Las decisiones técnicas deben priorizar la mantenibilidad a largo plazo.

---

## Mejora continua

Cada nueva funcionalidad debe mejorar el producto sin aumentar innecesariamente su complejidad.

Antes de implementar cualquier cambio se debe evaluar su impacto sobre:

- La experiencia de usuario.
- El rendimiento.
- La mantenibilidad.
- La escalabilidad.

---

# Qué NO es

Esta aplicación NO pretende ser:

- Un ERP.
- Un software de contabilidad profesional.
- Un programa de facturación.
- Un CRM.
- Un gestor de inventario completo.
- Una herramienta de recursos humanos.
- Un programa con cientos de configuraciones.

No debe intentar resolver todos los problemas de un negocio.

Su misión es resolver excepcionalmente bien uno muy concreto:

**Registrar la actividad económica diaria y mostrar, de forma rápida, clara y automática, la rentabilidad real del negocio.**

Cualquier funcionalidad futura deberá evaluarse bajo una única pregunta:

> **¿Hace que el usuario consiga ese objetivo de forma más rápida, sencilla o útil?**

Si la respuesta es no, probablemente no deba formar parte de la aplicación.
