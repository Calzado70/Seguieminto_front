function redirigir(selectId) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;
    selectElement.addEventListener('change', function() {
        const selectedOption = selectElement.options[selectElement.selectedIndex].value;
        if (selectedOption) {
            window.location.href = selectedOption;
        }
    });
}


// Event listeners
redirigir('adminUsuario');
redirigir('bodegas');
redirigir('historial');
redirigir('productos');


// Load users when page loads
document.addEventListener('DOMContentLoaded', () => {
    verificarTokenAlCargar();
});