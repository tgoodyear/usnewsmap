import json
import datetime

class HashList:
	def __init__(self):
		#we are assuming that the nodes are only added once at the begging, in order, and then the list is static until a new search is done. 
		self.hash_table = new HashTable()
		self.tail = None
		self.head = None

	def add_node(self,new_node):
		old_tail = self.tail
		self.tail = new_node
		if old_tail not None:
			old_tail.next = new_node
			new_node.prev = old_tail
			self.head = new_node #incase we lose tail because no nodes meet serach requirments, we can find the list again
		self.hash_table.addNode(new_node)

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
				self.hash_table.remNode(curr_node)
				curr_node = curr_node.prev
				self.tail = curr_node

	def getJson(self):
		return json.dump(self.hash_table)


class HashTable:
	def __init__(self):
		self.hash_table = {}

	def addNode(self,node):
		if node.hash not in self.hash_table:
			self.hash_table[node.hash] = []
		self.hash_table[node.hash].append(node)

	def remNode(self,node):
		if not len(self.hash_table[node.hash])
			return self.hash_table[node.hash].pop()
		return None

class Node:
	def __init__(self,marker=None):
		self.prev = None
		self.next = None
		self.marker = marker
		self.date = None
		self.hash = None


