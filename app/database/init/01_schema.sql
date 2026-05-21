-- Parroquia San Pedro Nolasco
-- Schema adaptado para MariaDB 11
-- Grupo 3 - Ingeniería en Software 1 - UVG 2026

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- ----------------------------
-- Tablas sin dependencias (catálogos)
-- ----------------------------

DROP TABLE IF EXISTS `rol`;
CREATE TABLE `rol` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `detalle` varchar(200) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rol_detalle` (`detalle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

DROP TABLE IF EXISTS `estado_reserva`;
CREATE TABLE `estado_reserva` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `detalle` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_estado_reserva_detalle` (`detalle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

DROP TABLE IF EXISTS `espacio`;
CREATE TABLE `espacio` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `capacidad` int(11) DEFAULT NULL CHECK (`capacidad` > 0),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

DROP TABLE IF EXISTS `tarea`;
CREATE TABLE `tarea` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `descripcion` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Persona (depende de rol)
-- ----------------------------

DROP TABLE IF EXISTS `persona`;
CREATE TABLE `persona` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_persona_correo` (`correo`),
  KEY `fk_persona_rol_idx` (`rol_id`),
  CONSTRAINT `fk_persona_rol` FOREIGN KEY (`rol_id`) REFERENCES `rol` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Tablas que dependen de persona
-- ----------------------------

DROP TABLE IF EXISTS `telefono`;
CREATE TABLE `telefono` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(50) NOT NULL,
  `persona_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_telefono_numero` (`numero`),
  KEY `fk_telefono_persona_idx` (`persona_id`),
  CONSTRAINT `fk_telefono_persona` FOREIGN KEY (`persona_id`) REFERENCES `persona` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

DROP TABLE IF EXISTS `grupo`;
CREATE TABLE `grupo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(200) NOT NULL,
  `coordinador_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_grupo_nombre` (`nombre`),
  UNIQUE KEY `uq_grupo_coordinador` (`coordinador_id`),
  CONSTRAINT `fk_grupo_coordinador` FOREIGN KEY (`coordinador_id`) REFERENCES `persona` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

DROP TABLE IF EXISTS `coordinador_ministro`;
CREATE TABLE `coordinador_ministro` (
  `coordinador_id` int(11) NOT NULL,
  `ministro_id` int(11) NOT NULL,
  PRIMARY KEY (`coordinador_id`,`ministro_id`),
  KEY `fk_coord_min_ministro_idx` (`ministro_id`),
  CONSTRAINT `fk_coord_min_coordinador` FOREIGN KEY (`coordinador_id`) REFERENCES `persona` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_coord_min_ministro` FOREIGN KEY (`ministro_id`) REFERENCES `persona` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

DROP TABLE IF EXISTS `asignacion_tarea`;
CREATE TABLE `asignacion_tarea` (
  `tarea_id` int(11) NOT NULL,
  `persona_id` int(11) NOT NULL,
  PRIMARY KEY (`tarea_id`,`persona_id`),
  KEY `fk_asig_tarea_persona_idx` (`persona_id`),
  CONSTRAINT `fk_asig_tarea_tarea` FOREIGN KEY (`tarea_id`) REFERENCES `tarea` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asig_tarea_persona` FOREIGN KEY (`persona_id`) REFERENCES `persona` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Notificacion (depende de grupo)
-- ----------------------------

DROP TABLE IF EXISTS `notificacion`;
CREATE TABLE `notificacion` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mensaje` text NOT NULL,
  `fecha` date NOT NULL,
  `tipo` ENUM('global','grupo','individual') NOT NULL DEFAULT 'global',
  `remitente_id` int(11) NULL,
  `grupo_id` int(11) NULL,
  PRIMARY KEY (`id`),
  KEY `fk_notificacion_remitente_idx` (`remitente_id`),
  KEY `fk_notificacion_grupo_idx` (`grupo_id`),
  CONSTRAINT `fk_notificacion_remitente` FOREIGN KEY (`remitente_id`) REFERENCES `persona` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notificacion_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupo` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

DROP TABLE IF EXISTS `persona_notificacion`;
CREATE TABLE `persona_notificacion` (
  `persona_id` int(11) NOT NULL,
  `notificacion_id` int(11) NOT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`persona_id`,`notificacion_id`),
  KEY `fk_pn_notificacion_idx` (`notificacion_id`),
  CONSTRAINT `fk_pn_persona` FOREIGN KEY (`persona_id`) REFERENCES `persona` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pn_notificacion` FOREIGN KEY (`notificacion_id`) REFERENCES `notificacion` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Reserva (depende de espacio y estado_reserva)
-- ----------------------------

DROP TABLE IF EXISTS `reserva`;
CREATE TABLE `reserva` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `espacio_id` int(11) DEFAULT NULL,
  `estado_reserva_id` int(11) NOT NULL,
  `solicitante_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_reserva_espacio_idx` (`espacio_id`),
  KEY `fk_reserva_estado_idx` (`estado_reserva_id`),
  KEY `fk_reserva_solicitante_idx` (`solicitante_id`),
  CONSTRAINT `fk_reserva_espacio` FOREIGN KEY (`espacio_id`) REFERENCES `espacio` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reserva_estado` FOREIGN KEY (`estado_reserva_id`) REFERENCES `estado_reserva` (`id`),
  CONSTRAINT `fk_reserva_solicitante` FOREIGN KEY (`solicitante_id`) REFERENCES `persona` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Evento (depende de persona y reserva)
-- ----------------------------

DROP TABLE IF EXISTS `evento`;
CREATE TABLE `evento` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `titulo` varchar(255) NOT NULL,
  `encargado_id` int(11) NOT NULL,
  `reserva_id` int(11) NOT NULL,
  `descripcion` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_evento_reserva` (`reserva_id`),
  KEY `fk_evento_encargado_idx` (`encargado_id`),
  CONSTRAINT `fk_evento_encargado` FOREIGN KEY (`encargado_id`) REFERENCES `persona` (`id`),
  CONSTRAINT `fk_evento_reserva` FOREIGN KEY (`reserva_id`) REFERENCES `reserva` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
