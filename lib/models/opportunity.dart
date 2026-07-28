class Opportunity {
  const Opportunity({
    required this.id,
    required this.title,
    required this.organizerName,
    required this.description,
    required this.country,
    required this.city,
    required this.type,
    required this.positions,
    required this.deadline,
    required this.rawPayload,
  });

  final String id;
  final String title;
  final String organizerName;
  final String description;
  final String country;
  final String city;
  final String type;
  final List<String> positions;
  final DateTime? deadline;
  final Map<String, dynamic> rawPayload;

  factory Opportunity.fromJson(Map<String, dynamic> json) {
    final positionData = json['positions'] ?? json['targetPositions'];
    return Opportunity(
      id: '${json['id'] ?? ''}',
      title: '${json['title'] ?? ''}',
      organizerName: '${json['organizerName'] ?? ''}',
      description: '${json['description'] ?? ''}',
      country: '${json['country'] ?? ''}',
      city: '${json['city'] ?? ''}',
      type: '${json['opportunityType'] ?? json['type'] ?? ''}',
      positions: positionData is List
          ? positionData.map((item) => '$item').toList()
          : const [],
      deadline: DateTime.tryParse(
        '${json['applicationDeadline'] ?? json['deadline'] ?? ''}',
      ),
      rawPayload: Map<String, dynamic>.from(json),
    );
  }
}
