import json
import datetime

class HashList:
	def __init__(self,hash_table={},linked_list = []):
		#we are assuming that the nodes are only added once at the begging, in order, and then the list is static until a new search is done. 
		self.hash_table = HashTable(hash_table)
		self.linked_list = linked_list
		self.tail = None
		self.head = None

	def add_node(self,new_node):
		self.linked_list.append(new_node)
		if self.head is None:
			self.head = 0
			self.tail = 0
		else:
			self.tail = self.tail + 1

		self.hash_table.add_Node(new_node)

	def update(self,date):
		if self.tail >= 0
			curr_node = self.linked_list[self.tail]
		else:
			curr_node = self.linked_list[self.head]
 

		if curr_node['date'] <= date:#current date, is smaller or equal to, so add more nodes til we cant anymore
			while True:
				self.hash_table.add_Node(curr_node)
				self.tail = self.tail + 1
				curr_node = self.linked_list[self.tail]
				if self.tail is >= len(self.linked_list) or curr_node['date'] > date:
					break
				

		else:#current date is larger then target date, so remove nodes til we cant anymore
			while True:
				self.hash_table.rem_Node(curr_node)
				self.tail = self.tail - 1
				curr_node = self.linked_list[self.tail]
				if 	self.tail < 0 or curr_node['date'] <= date:
					break
				


	def get_hash_json(self):
		return json.dumps(self.hash_table.get_json_data())
	def get_list_json(self):
		return self.linked_list


class HashTable:
	def __init__(self,hash_table = {}):
		self.hash_table = hash_table

	def add_Node(self,node):
		if node['hash'] not in self.hash_table:
			self.hash_table[node['hash']] = []
		self.hash_table[node['hash']].append(node)

	def rem_Node(self,node):
		if not len(self.hash_table[node['hash']]):
			return self.hash_table[node['hash']].pop()
		return None

	def get_json_data(self):
		ans = []
		for key in self.hash_table.keys():
			for spot in self.hash_table[key]:
				ans.append(spot)
			
		return ans
			

# class Node:
# 	def __init__(self,marker=None):
# 		self.prev = None
# 		self.next = None
# 	#	self.marker = marker
# 		self.hash = marker["city"]

# 		for key in marker:
# 			setattr(self,key,marker[key])

# 	def get_dict_rep(self):
# 		ans = {}
# 		ignore = ["__init__","__doc__","__module__","get_dict_rep","next","prev"]
# 		for attr in dir(self):
# 			if attr not in ignore:
# 				ans[attr] = getattr(self,attr)
			
			
# 		return ans
 

