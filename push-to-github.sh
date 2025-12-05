#!/bin/bash

# Script para subir el proyecto a GitHub
# Uso: ./push-to-github.sh TU_USUARIO NOMBRE_REPO

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "❌ Error: Debes proporcionar tu usuario de GitHub y el nombre del repositorio"
    echo ""
    echo "Uso: ./push-to-github.sh TU_USUARIO NOMBRE_REPO"
    echo "Ejemplo: ./push-to-github.sh dantecollazzi CozyUI"
    exit 1
fi

USERNAME=$1
REPO_NAME=$2

echo "🚀 Configurando repositorio remoto..."
git remote add origin https://github.com/${USERNAME}/${REPO_NAME}.git 2>/dev/null || \
git remote set-url origin https://github.com/${USERNAME}/${REPO_NAME}.git

echo "📤 Subiendo código a GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Proyecto subido exitosamente!"
    echo "🌐 Visita: https://github.com/${USERNAME}/${REPO_NAME}"
else
    echo ""
    echo "❌ Error al subir. Asegúrate de:"
    echo "   1. Haber creado el repositorio en GitHub primero"
    echo "   2. Tener permisos de escritura"
    echo "   3. Estar autenticado (git config --global user.name y user.email)"
fi

