import json
import datetime
import time

class HashList:
	def __init__(self,id=6,hash_table={},linked_list=[],tail=None,head=None):
		#we are assuming that the nodes are only added once at the begging, in order, and then the list is static until a new search is done. 
		self.id = id
		self.hash_table = HashTable(hash_table)
		self.linked_list = linked_list
		self.tail = tail
		self.head = head
	
	def get_id(self):
		return self.id

	
	def add_node(self,new_node):
		self.linked_list.append(new_node)
		if self.head is None:
			self.head = 0
			self.tail = 0
		else:
			self.tail = self.tail + 1

		self.hash_table.add_Node(new_node)

	def update(self,date):
	
		if self.tail >= 0:
			curr_node = self.linked_list[self.tail]

 		else:
            self.tail = -1
            curr_node = self.linked_list[self.head]


		if curr_node['date'] > date:#current date is larger then target date, so remove nodes til we cant anymore
			if self.tail == -1:
				return

			while True:
				self.hash_table.rem_Node(curr_node)
				self.tail = self.tail - 1
				if self.tail < 0:
					return
				curr_node = self.linked_list[self.tail]
				if curr_node['date'] <= date:
					return
		elif curr_node['date'] < date:#current date, is smaller or equal to, so add more nodes til we cant anymore
			if self.tail == -1:
				self.hash_table.add_Node(curr_node)
                self.tail = self.tail + 1
            if self.tail + 1 >= len(self.linked_list):
				return  

			curr_node = self.linked_list[self.tail + 1]
			while True:
				if curr_node['date'] > date:
					return
				self.hash_table.add_Node(curr_node)
				self.tail = self.tail + 1
				if self.tail + 1 >= len(self.linked_list):
                    return
				curr_node = self.linked_list[self.tail + 1]

	def get_hash_json(self):
		return json.dumps(self.hash_table.get_json_data())

	def get_list_json(self):
		return self.linked_list

	def get_mongo_format(self):
		ts = time.time()
		isodate = datetime.datetime.fromtimestamp(ts, None)
		ans = {}
		ans['id'] = self.id
		ans['hash'] = self.hash_table.hash_table
		ans['linked_list'] = self.linked_list
		ans['head'] = self.head
		ans['tail'] = self.tail
		ans['created_at'] = isodate
		return ans

class HashTable:
	def __init__(self,hash_table = {}):
		self.hash_table = hash_table

	def add_Node(self,node):
		if node['hash'] not in self.hash_table:
			self.hash_table[node['hash']] = []
		self.hash_table[node['hash']].append(node)

	def rem_Node(self,node):
		if len(self.hash_table[node['hash']]):
			return self.hash_table[node['hash']].pop()
		return None

	def get_json_data(self):
		ans = []
		for key in self.hash_table.keys():
			for spot in self.hash_table[key]:
				ans.append(spot)
			
		return ans