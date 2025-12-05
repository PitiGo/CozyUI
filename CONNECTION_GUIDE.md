# 🔌 Guía de Conexión de Nodos

Esta guía explica cómo conectar los nodos en CozyUI.

---

## 📊 Diagrama de Conexiones

### Text-to-Image (Básico)

```
┌─────────────┐
│ Text Prompt │
│   (Prompt)  │
└──────┬──────┘
       │ (conectar al handle superior)
       ▼
┌─────────────┐      ┌─────────────┐
│   Run       │      │    Model    │
│ Inference   │◄─────│   Loader    │
│             │      │             │
└──────┬──────┘      └─────────────┘
       │ (conectar al handle inferior)
       │
       ▼
┌─────────────┐
│   Image     │
│  Display    │
└─────────────┘
```

### Image-to-Image (Con Imagen)

```
┌─────────────┐
│ Text Prompt │
│   (Prompt)  │
└──────┬──────┘
       │ (handle superior - azul)
       │
┌──────▼──────┐
│   Run       │
│ Inference   │
│             │
└─────────────┘
       ▲
       │ (handle medio - rosa)
       │
┌──────┴──────┐      ┌─────────────┐
│ Image to    │      │    Model    │
│ Image       │      │   Loader    │
│             │      │             │
└─────────────┘      └──────┬──────┘
                            │ (handle inferior - violeta)
                            │
                            ▼
                    ┌─────────────┐
                    │   Run       │
                    │ Inference   │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Image     │
                    │  Display    │
                    └─────────────┘
```

---

## 🎯 Pasos Detallados

### Para Text-to-Image:

1. **Arrastra los nodos al canvas:**
   - Text Prompt
   - Model Loader
   - Run Inference
   - Image Display

2. **Conecta los nodos:**
   - **Text Prompt** → **Run Inference** (handle superior, azul)
   - **Model Loader** → **Run Inference** (handle inferior, violeta)
   - **Run Inference** → **Image Display** (handle de salida, verde)

### Para Image-to-Image:

1. **Arrastra los nodos al canvas:**
   - Text Prompt
   - Image to Image
   - Model Loader
   - Run Inference
   - Image Display

2. **Sube una imagen en el nodo "Image to Image"**

3. **Conecta los nodos:**
   - **Text Prompt** → **Run Inference** (handle superior, azul)
   - **Image to Image** → **Run Inference** (handle medio, rosa) ⭐
   - **Model Loader** → **Run Inference** (handle inferior, violeta)
   - **Run Inference** → **Image Display** (handle de salida, verde)

---

## 🎨 Colores de los Handles

| Color | Handle | Descripción |
|-------|--------|-------------|
| 🔵 **Azul** | `prompt-in` | Entrada de prompt (superior) |
| 🌹 **Rosa** | `image-in` | Entrada de imagen (medio) |
| 🟣 **Violeta** | `model-in` | Entrada de modelo (inferior) |
| 🟢 **Verde** | `image-out` | Salida de imagen generada |

---

## 💡 Tips

1. **Orden de conexión no importa**: Puedes conectar en cualquier orden.

2. **Conexión opcional**: El nodo Image to Image es opcional. Si no lo conectas, se generará text-to-image normal.

3. **Múltiples conexiones**: Puedes tener varios nodos conectados, pero solo se usará el primero encontrado.

4. **Visual feedback**: Los handles cambian de color cuando pasas el mouse sobre ellos.

---

## ❓ Preguntas Frecuentes

### ¿Tengo que conectar el nodo Image to Image?

**Sí, es recomendable** conectarlo al handle medio (rosa) del nodo Run Inference para mayor claridad. Sin embargo, el sistema también lo detectará automáticamente si está en el canvas.

### ¿Qué pasa si no conecto el nodo Image to Image?

Si no lo conectas pero está en el canvas con una imagen cargada, el sistema lo detectará automáticamente. Pero es mejor conectarlo para mayor claridad.

### ¿Puedo tener varios nodos Image to Image?

Sí, pero solo se usará el primero que encuentre el sistema. Es mejor tener solo uno conectado.

### ¿El orden de conexión importa?

No, puedes conectar en cualquier orden. Lo importante es que todos los nodos necesarios estén conectados.

---

*Última actualización: Diciembre 2024*

