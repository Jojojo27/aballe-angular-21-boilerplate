FROM php:8.2-apache

# Enable mod_rewrite and mod_headers
RUN a2enmod rewrite headers

# Set Apache DocumentRoot to /var/www/html/api
ENV APACHE_DOCUMENT_ROOT /var/www/html/api

RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Allow .htaccess overrides
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Install mysqli and ensure openssl is available
RUN docker-php-ext-install mysqli

# Copy backend files
COPY . /var/www/html/api/

# Fix permissions
RUN chown -R www-data:www-data /var/www/html/api

EXPOSE 80
