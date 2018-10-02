-- phpMyAdmin SQL Dump
-- version 4.5.2
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Oct 02, 2018 at 03:50 PM
-- Server version: 10.1.16-MariaDB
-- PHP Version: 7.0.9

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `telin`
--

-- --------------------------------------------------------

--
-- Table structure for table `telin_user`
--

CREATE TABLE `telin_user` (
  `username` varchar(25) NOT NULL,
  `password` varchar(25) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(100) NOT NULL,
  `token` varchar(25) NOT NULL,
  `otp` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `telin_user`
--

INSERT INTO `telin_user` (`username`, `password`, `name`, `phone`, `email`, `token`, `otp`) VALUES
('herdi', 'herdi', 'Herdianto', '+628563330006', 'herdi.16@gmail.com', 'HDxXqhMLBInC', '93327'),
('umi', 'umi', 'Umi Kuswari', '+628566630200', 'umikuswari@gmail.com', 'PPJSgyOcjxSs', '91660');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `telin_user`
--
ALTER TABLE `telin_user`
  ADD PRIMARY KEY (`username`);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
