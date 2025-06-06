function loadPartial(id, url) {
    fetch(url)
        .then(response => response.text())
        .then(data => {
            document.getElementById(id).innerHTML = data;
        })
        .catch(err => console.error('Ошибка загрузки', url, err));
}

// Подгружаем header и footer
loadPartial('header-container', 'partials/header.html');
loadPartial('footer-container', 'partials/footer.html');
loadPartial('solve-container', 'partials/solve.html');
loadPartial('sidebar-container', 'partials/sidebar.html');
