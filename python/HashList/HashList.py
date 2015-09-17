import json
import datetime

class HashList:
	def __init__(self):
		#we are assuming that the nodes are only added once at the begging, in order, and then the list is static until a new search is done. 
		self.hash_table = HashTable()
		self.tail = None
		self.head = None

	def add_node(self,new_node):
		old_tail = self.tail
		self.tail = new_node
		if old_tail is not None:
			old_tail.next = new_node
			new_node.prev = old_tail
			self.head = new_node #incase we lose tail because no nodes meet serach requirments, we can find the list again
		self.hash_table.add_Node(new_node)

	def update(self,date):
		curr_node = self.tail
		if curr_node is None:
			curr_node = self.head

		if curr_node.date <= date:#current date, is smaller or equal to, so add more nodes til we cant anymore
			while curr_node is not None and curr_node.date <= date:
				self.hash_table.addNode(curr_node)
				self.tail = curr_node
				curr_node = curr_node.next
		else:#current date is larger then target date, so remove nodes til we cant anymore
			while curr_node is not None and curr_node.date > date:
				self.hash_table.rem_Node(curr_node)
				curr_node = curr_node.prev
				self.tail = curr_node

	def get_json(self):
		return json.dumps(self.hash_table.get_json_data())


class HashTable:
	def __init__(self):
		self.hash_table = {}

	def add_Node(self,node):
		if node.hash not in self.hash_table:
			self.hash_table[node.hash] = []
		self.hash_table[node.hash].append(node)

	def rem_Node(self,node):
		if not len(self.hash_table[node.hash]):
			return self.hash_table[node.hash].pop()
		return None

	def get_json_data(self):
		ans = {}
		for key in self.hash_table.keys():
			city = []
			for spot in self.hash_table[key]:
				city.append(spot.get_dict_rep())
			ans[key] = city
		return ans
			

class Node:
	def __init__(self,marker=None):
		self.prev = None
		self.next = None
	#	self.marker = marker
		self.hash = marker["city"]

		for key in marker:
			setattr(self,key,marker[key])

	def get_dict_rep(self):
		return self.marker
 

