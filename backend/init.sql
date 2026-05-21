CREATE TABLE IF NOT EXISTS `accounts` (
  `id`                  INT AUTO_INCREMENT PRIMARY KEY,
  `title`               VARCHAR(10)  NOT NULL,
  `firstName`           VARCHAR(100) NOT NULL,
  `lastName`            VARCHAR(100) NOT NULL,
  `email`               VARCHAR(255) NOT NULL UNIQUE,
  `passwordHash`        VARCHAR(255) NOT NULL,
  `role`                ENUM('Admin','User') NOT NULL DEFAULT 'User',
  `isVerified`          TINYINT(1)   NOT NULL DEFAULT 0,
  `verificationToken`   VARCHAR(255)          DEFAULT NULL,
  `resetToken`          VARCHAR(255)          DEFAULT NULL,
  `resetTokenExpires`   DATETIME              DEFAULT NULL,
  `jwtToken`            VARCHAR(500)          DEFAULT NULL,
  `created`             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated`             DATETIME              DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
