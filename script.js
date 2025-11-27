
document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("themeToggle");
    if (btn) {
        btn.addEventListener("click", function () {
            document.body.classList.toggle("dark");
        });
    }
});
