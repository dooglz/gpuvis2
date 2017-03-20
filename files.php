<?php
	header("Access-Control-Allow-Origin: *");
	header("Access-Control-Allow-Credentials: true");
	$files = array_map('basename', glob("./data/*.{txt}", GLOB_BRACE));
  echo json_encode($files);
?>