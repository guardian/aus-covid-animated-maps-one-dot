#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import pandas as pd
import fiona
from shapely.geometry import Point, shape
import random
import ast
import csv

#%%
url = "https://data.nsw.gov.au/data/dataset/97ea2424-abaf-4f3e-a9f2-b5c883f42b6a/resource/2776dbb8-f807-4fb2-b1ed-184a6fc2c8aa/download/covid-19-cases-by-notification-date-location-and-likely-source-of-infection.csv"
print("Getting", url)
r = requests.get(url)
with open("nsw.csv", 'w') as f:
	f.write(r.text)
#%%	
nsw = pd.read_csv("nsw.csv")	

# test postcodes 2170, 2760

test_postcodes = ["2170","2760"]

# test = nsw[nsw['postcode'].isin(test_postcodes)]
cases1 = nsw[nsw['notification_date'] >= "2020-03-01"]
# test = test[test['postcode'].isin(test_postcodes)]
# cases1 = nsw.copy()

def combine(row):
	if row['likely_source_of_infection'] == "Locally acquired - linked to known case or cluster":
		return "Local"
	elif row['likely_source_of_infection'] == "Locally acquired - no links to known case or cluster" or row['likely_source_of_infection'] == "Locally acquired - investigation ongoing":
		return "Local"
	elif row['likely_source_of_infection'] == "Overseas":
		return "Overseas"
	elif row['likely_source_of_infection'] == "Interstate":
		return "Local"

cases1['combined'] = cases1.apply(combine, axis=1)

cases1[['notification_date','postcode','combined']].to_csv("cases.csv", index=False)

#%%

postcodes = list(cases1['postcode'].unique())

polygons = {}

for postcode in postcodes:
	with fiona.open("POA_2016_AUST.shp") as src:
			filtered = list(filter(lambda f: f['properties']['POA_CODE16']==postcode, src))
			if len(filtered) > 0:
				print("got", postcode)
				polygon = shape(filtered[0]['geometry'])
				polygons[postcode] = polygon
			else:
				print("Can't find:",postcode)	
#%%
print(polygons)

def returnPoints(postcode):
	# get the right polygon
	if postcode in polygons:
		polygon = polygons[postcode]
		#print(filtered['properties'])
		points = []
		minx, miny, maxx, maxy = polygon.bounds
		while len(points) < 2:
			pnt = Point(random.uniform(minx, maxx), random.uniform(miny, maxy))
			if polygon.contains(pnt):
				points.append(pnt.x)
				points.append(pnt.y)
				return points
	else:
		return None			

# def returnPoints(postcode):
# 	# get the right polygon
# 	with fiona.open("POA_2016_AUST.shp") as src:
# 		filtered = list(filter(lambda f: f['properties']['POA_CODE16']==postcode, src))
# 		if len(filtered) > 0:
# 			polygon = shape(filtered[0]['geometry'])
# 			#print(filtered['properties'])
# 			points = []
# 			minx, miny, maxx, maxy = polygon.bounds
# 			while len(points) < 2:
# 				pnt = Point(random.uniform(minx, maxx), random.uniform(miny, maxy))
# 				if polygon.contains(pnt):
# 					points.append(pnt.x)
# 					points.append(pnt.y)
# 					return points

#%%
header = ['time','postcode','combined',"longitude", "latitude"]

with open("nsw-output.csv", 'w') as csvoutput:
	csv_writer = csv.writer(csvoutput, header)
	csv_writer.writerow(header)
# 	dict_writer.writerows(newCsvDict)

#%%

with open("cases.csv") as caseFile:	
	caseReader = csv.DictReader(caseFile)
	cases2 = list(caseReader)
	total = len(cases2)
	for i, row in enumerate(cases2):
		print(i,"/",total)
		coords = returnPoints(row['postcode'])
# 		print(coords)
		if coords != None:		
			newRow = list(row.values())
			newRow.extend(coords)
# 			print(newRow)
			with open("nsw-output.csv", 'a') as f:
			    writer = csv.writer(f)
			    writer.writerow(newRow)
		
		
# result = returnPoints("2170")
	
# test["coords"] = test.apply(returnPoints, axis=1)

