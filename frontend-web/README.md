## MediML Web Frontend

This folder contains the web UI assets for MediML:

- HTML pages at the root
- CSS in `css/`
- JavaScript in `js/`

The backend is configured to serve static files from this folder first via:

`spring.web.resources.static-locations=file:../frontend-web/,classpath:/static/`

This keeps UI routes unchanged while separating web frontend assets from backend Java code.
