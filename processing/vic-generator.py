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
url = "https://www.dhhs.vic.gov.au/ncov-covid-cases-by-lga-source-csv"
print("Getting", url)
r = requests.get(url)
with open("vic.csv", 'w') as f:
	f.write(r.text)
#%%	
cases = pd.read_csv("vic.csv")	

cases = cases.rename(columns={"diagnosis_date":"date", "Localgovernmentarea":"postcode"})

blah = list(cases['acquired'].unique())

#%%
# test postcodes 2170, 2760

# test = nsw[nsw['postcode'].isin(test_postcodes)]
cases1 = cases[cases['date'] >= "2020-03-01"]
# test = test[test['postcode'].isin(test_postcodes)]
# cases1 = nsw.copy()

def combine(row):
	if row['acquired'] == "Acquired in Australia, unknown source":
		return "Local"
	elif row['acquired'] == "Contact with a confirmed case":
		return "Local"
	elif row['acquired'] == "Under investigation":
		return "Local"
	elif row['acquired'] == "Travel overseas":
		return "Overseas"

cases1['combined'] = cases1.apply(combine, axis=1)

cases1[['date','postcode','combined']].to_csv("vic-cases.csv", index=False)

#%%

postcodes = list(cases1['postcode'].unique())
#%%
polygons = {}

for postcode in postcodes:
	with fiona.open("vic-ocean.shp") as src:
			filtered = list(filter(lambda f: f['properties']['LGA_NAME20']==postcode, src))
			if len(filtered) > 0:
				print("got", postcode)
				polygon = shape(filtered[0]['geometry'])
				polygons[postcode] = polygon
			else:
				print("Can't find:",postcode)
#%%
# print(polygons)

# with fiona.open("blah.shp") as ocean:
#  	ocean_shp = next(iter(ocean))
#  	ocean_poly = shape(ocean_shp['geometry'])

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
				print(points)
				return points
	else:
		return None

#%%
header = ['time','postcode','combined',"longitude", "latitude"]

with open("vic-output.csv", 'w') as csvoutput:
	csv_writer = csv.writer(csvoutput)
	csv_writer.writerow(header)
# 	dict_writer.writerows(newCsvDict)

#%%

with open("vic-cases.csv") as caseFile:	
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
			with open("vic-output.csv", 'a') as f:
			    writer = csv.writer(f)
			    writer.writerow(newRow)
		
		
# result = returnPoints("2170")
	
# test["coords"] = test.apply(returnPoints, axis=1)

